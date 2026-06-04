import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, ArrowRight, ExternalLink, MessageCircle, Pencil, Trash2, CreditCard, Package, Tag } from 'lucide-react'
import { formatUSD } from '../lib/utils'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import ClienteModal from '../components/ClienteModal'

const DELIVERY_LABEL = {
  sin_editar: 'Sin editar',
  editando: 'Editando',
  revision: 'En revisión',
  entregado: 'Entregado',
}
const DELIVERY_BADGE = {
  sin_editar: 'bg-subtle text-soft',
  editando: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  revision: 'bg-yellow-50 text-yellow-800 border border-yellow-300',
  entregado: 'bg-green-50 text-green-700 border border-green-200',
}

const STAGE_LABEL = {
  consulta: 'Consulta', cotizado: 'Cotizado', confirmado: 'Confirmado',
  cobrado: 'Cobrado', cancelado: 'Cancelado',
}
const STAGE_BADGE = {
  consulta:   'bg-subtle text-soft',
  cotizado:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border border-green-200',
  cobrado:    'bg-green-50 text-green-800 border border-green-300',
  cancelado:  'bg-red-50 text-red-600 border border-red-200',
}
const TYPE_LABEL = { sena: 'Seña', cuota: 'Cuota', saldo: 'Saldo final' }

const PROCESO = [
  { key: 'pdf_enviado',      label: 'PDF de propuesta enviado' },
  { key: 'reunion',          label: 'Reunión realizada' },
  { key: 'contrato',         label: 'Contrato firmado' },
  { key: 'sena',             label: 'Seña cobrada (50%)' },
  { key: 'cuestionario',     label: 'Cuestionario previo enviado' },
  { key: 'evento',           label: 'Evento cubierto' },
  { key: 'edicion',          label: 'Edición entregada' },
  { key: 'resena',           label: 'Reseña de Google solicitada' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })
  } catch (_e) { return dateStr }
}

function safeFormatDatetime(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es })
  } catch (_e) { return dateStr }
}


function Section({ title, children }) {
  return (
    <div className="bg-card border border-line rounded-xl p-5 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gold mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs text-faint mb-0.5">{label}</div>
      <div className="text-sm text-body">{children}</div>
    </div>
  )
}

function EventTimeField({ clientId, value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  useEffect(() => { setVal(value || '') }, [value])

  async function save() {
    await supabase.from('clients').update({ event_time: val || null }).eq('id', clientId)
    onChange(val || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="ej: 18:00"
          autoFocus
          className="border border-strong rounded px-2 py-1 text-sm text-body focus:outline-none w-24"
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={save} className="text-xs text-body font-medium hover:underline">Guardar</button>
        <button onClick={() => setEditing(false)} className="text-xs text-faint hover:text-muted">Cancelar</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span>{value || <span className="text-dim italic text-xs">Sin horario</span>}</span>
      <button onClick={() => setEditing(true)} className="text-xs text-dim hover:text-muted transition-colors">editar</button>
    </div>
  )
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [lastPayment, setLastPayment] = useState(null)
  const [leadStage, setLeadStage] = useState(null)
  const [actividad, setActividad] = useState([])
  const [pendingTasks, setPendingTasks] = useState(0)
  const [tareas, setTareas] = useState([])
  const [notes, setNotes] = useState('')
  const [allIds, setAllIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creatingDelivery, setCreatingDelivery] = useState(false)
  const debounceRef = useRef(null)

  const fetchClient = useCallback(async () => {
    try {
    const [
      { data: c },
      { data: deliveries },
      { data: payments },
      { data: leads },
      { data: taskCount },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('deliveries').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('client_id', id).order('paid_at', { ascending: false }),
      supabase.from('leads').select('stage, created_at').eq('client_id', id).limit(1),
      supabase.from('tasks').select('*').eq('client_id', id).order('done').order('created_at', { ascending: false }),
    ])
    setClient(c)
    setNotes(c?.notes || '')
    setDelivery(deliveries?.[0] || null)
    setLastPayment(payments?.[0] || null)
    setLeadStage(leads?.[0]?.stage || null)
    const tareasData = taskCount || []
    setTareas(tareasData)
    setPendingTasks(tareasData.filter(t => !t.done).length)

    // Construir log de actividad
    const events = []
    if (leads?.[0]) events.push({
      date: leads[0].created_at,
      icon: 'lead',
      text: `Lead ingresado — ${STAGE_LABEL[leads[0].stage] || leads[0].stage}`,
    })
    for (const p of payments || []) events.push({
      date: p.paid_at || p.created_at,
      icon: 'pago',
      text: `Pago registrado — ${TYPE_LABEL[p.type] || p.type} · ${formatUSD(p.amount)}`,
    })
    for (const d of deliveries || []) {
      events.push({ date: d.created_at, icon: 'entrega', text: 'Entrega creada' })
      if (d.delivered_at) events.push({ date: d.delivered_at, icon: 'entregado', text: 'Marcado como entregado' })
    }
    events.sort((a, b) => new Date(b.date) - new Date(a.date))
    setActividad(events)

    setLoading(false)
    } catch (e) {
      console.error('ClienteDetalle fetchClient error:', e)
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchClient() }, [fetchClient])

  useEffect(() => {
    supabase.from('clients').select('id').order('event_date', { ascending: true })
      .then(({ data }) => setAllIds((data || []).map(c => c.id)))
  }, [])

  function handleNotesChange(e) {
    const val = e.target.value
    setNotes(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      supabase.from('clients').update({ notes: val }).eq('id', id)
    }, 1000)
  }

  async function handleCreateDelivery() {
    setCreatingDelivery(true)
    const promisedAt = client.event_date
      ? format(addDays(parseISO(client.event_date), 30), 'yyyy-MM-dd')
      : null
    await supabase.from('deliveries').insert({
      client_id: id, status: 'sin_editar', promised_at: promisedAt,
    })
    setCreatingDelivery(false)
    fetchClient()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', id)
    navigate('/clientes')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-faint">
        Cargando...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-muted">Cliente no encontrado.</p>
        <button onClick={() => navigate('/clientes')} className="text-sm underline text-body">
          Volver
        </button>
      </div>
    )
  }

  const whatsappPhone = client.phone?.replace(/\D/g, '')

  // Prev/next navigation
  const navIdx = allIds.indexOf(id)
  const prevId = navIdx > 0 ? allIds[navIdx - 1] : null
  const nextId = navIdx >= 0 && navIdx < allIds.length - 1 ? allIds[navIdx + 1] : null
  const navBlock = allIds.length > 1 ? (
    <div className="flex items-center justify-between mt-2 mb-6">
      <button onClick={() => navigate(`/clientes/${prevId}`)} disabled={!prevId}
        className="flex items-center gap-2 text-sm text-soft border border-line px-4 py-2 rounded-xl hover:border-strong hover:text-body transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ArrowLeft size={14} />
        Cliente anterior
      </button>
      <span className="text-xs text-faint">{navIdx >= 0 ? navIdx + 1 : '?'} / {allIds.length}</span>
      <button onClick={() => navigate(`/clientes/${nextId}`)} disabled={!nextId}
        className="flex items-center gap-2 text-sm text-soft border border-line px-4 py-2 rounded-xl hover:border-strong hover:text-body transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Cliente siguiente
        <ArrowRight size={14} />
      </button>
    </div>
  ) : null

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className="p-1.5 text-muted hover:text-body transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-semibold text-body flex-1">{client.name}</h1>
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 border border-line text-sm text-body px-3 py-1.5 rounded-xl hover:border-strong transition-colors"
        >
          <Pencil size={13} />
          Editar
        </button>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="flex items-center gap-1.5 border border-line text-sm text-red-600 px-3 py-1.5 rounded-xl hover:border-red-300 transition-colors"
        >
          <Trash2 size={13} />
          Eliminar
        </button>
      </div>

      {/* Contacto */}
      <Section title="Datos de contacto">
        <Field label="Nombre">{client.name}</Field>

        {client.phone && (
          <div className="mb-3">
            <div className="text-xs text-faint mb-0.5">Teléfono</div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-body">{client.phone}</span>
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-green-700 border border-green-200 bg-green-50 px-2.5 py-1 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={12} />
                  Escribir por WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {client.email && <Field label="Email">{client.email}</Field>}

        {client.instagram && (
          <div className="mb-3 last:mb-0">
            <div className="text-xs text-faint mb-0.5">Instagram</div>
            <a
              href={`https://instagram.com/${client.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-body underline underline-offset-2 hover:text-soft transition-colors w-fit"
            >
              {client.instagram.startsWith('@') ? client.instagram : `@${client.instagram}`}
              <ExternalLink size={11} />
            </a>
          </div>
        )}
      </Section>

      {/* Evento */}
      <Section title="Evento">
        <div className="grid grid-cols-2 gap-x-6">
          <Field label="Tipo de evento">{client.event_type || '—'}</Field>
          <Field label="Fecha">{formatDate(client.event_date)}</Field>
          <Field label="Horario"><EventTimeField clientId={client.id} value={client.event_time} onChange={v => setClient(prev => ({ ...prev, event_time: v }))} /></Field>
          <Field label="Paquete">{client.package || '—'}</Field>
          <Field label="Precio total">{formatUSD(client.total_price)}</Field>
        </div>
        {/* Cliente recurrente */}
        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Visitas</span>
            {(client.visit_count || 1) > 1 && (() => {
              const v = client.visit_count || 1
              const cls = v >= 8 ? 'bg-purple-900 text-white border-purple-900'
                : v >= 6 ? 'bg-purple-700 text-white border-purple-700'
                : v >= 4 ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-purple-100 text-purple-700 border-purple-300'
              return (
                <span className={`text-xs px-1.5 py-0.5 rounded-xl border font-medium ${cls}`}>
                  Cliente recurrente
                </span>
              )
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const newCount = Math.max(1, (client.visit_count || 1) - 1)
                await supabase.from('clients').update({ visit_count: newCount }).eq('id', client.id)
                setClient(prev => ({ ...prev, visit_count: newCount }))
              }}
              className="w-7 h-7 flex items-center justify-center border border-line rounded-md text-muted hover:text-body hover:border-strong transition-colors text-lg leading-none"
            >−</button>
            <span className="text-sm font-semibold text-body w-4 text-center">{client.visit_count || 1}</span>
            <button
              onClick={async () => {
                const newCount = (client.visit_count || 1) + 1
                await supabase.from('clients').update({ visit_count: newCount }).eq('id', client.id)
                setClient(prev => ({ ...prev, visit_count: newCount }))
              }}
              className="w-7 h-7 flex items-center justify-center border border-line rounded-md text-muted hover:text-body hover:border-strong transition-colors text-lg leading-none"
            >+</button>
          </div>
        </div>
        {leadStage && (
          <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
            <span className="text-xs text-faint">Estado en pipeline:</span>
            <span className={`text-xs px-2 py-0.5 rounded-xl font-medium ${STAGE_BADGE[leadStage]}`}>
              {STAGE_LABEL[leadStage]}
            </span>
          </div>
        )}
      </Section>

      {/* Proceso */}
      <Section title="Proceso">
        {(() => {
          const checklist = client.checklist || {}
          const done = PROCESO.filter(p => checklist[p.key]).length
          const pct = Math.round((done / PROCESO.length) * 100)
          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted">{done} de {PROCESO.length} pasos completados</span>
                <span className="text-xs font-semibold" style={{ color: pct === 100 ? '#22C55E' : '#C9A96E' }}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-subtle rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#22C55E' : '#C9A96E' }}
                />
              </div>
              <div className="space-y-2">
                {PROCESO.map((paso, i) => {
                  const checked = !!checklist[paso.key]
                  return (
                    <button
                      key={paso.key}
                      onClick={async () => {
                        const newChecklist = { ...checklist, [paso.key]: !checked }
                        await supabase.from('clients').update({ checklist: newChecklist }).eq('id', client.id)
                        setClient(prev => ({ ...prev, checklist: newChecklist }))
                      }}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked
                          ? 'border-gold bg-gold'
                          : 'border-line bg-card group-hover:border-gold'
                      }`}>
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm transition-colors ${checked ? 'text-faint line-through' : 'text-body'}`}>
                        <span className="text-xs text-gold mr-1.5 font-medium">0{i + 1}</span>
                        {paso.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )
        })()}
      </Section>

      {/* Historial */}
      <Section title="Historial">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-faint mb-1">Último pago</div>
            {lastPayment ? (
              <>
                <div className="text-sm font-medium text-body">{formatUSD(lastPayment.amount)}</div>
                <div className="text-xs text-muted mt-0.5 capitalize">{lastPayment.type}</div>
              </>
            ) : (
              <div className="text-sm text-dim">Sin pagos</div>
            )}
          </div>

          <div>
            <div className="text-xs text-faint mb-1">Entrega</div>
            {delivery ? (
              <span className={`text-xs px-2 py-0.5 rounded-xl font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                {DELIVERY_LABEL[delivery.status]}
              </span>
            ) : (
              <button
                onClick={handleCreateDelivery}
                disabled={creatingDelivery}
                className="text-xs border border-line px-2 py-1 rounded-xl text-soft hover:border-strong transition-colors disabled:opacity-50"
              >
                {creatingDelivery ? 'Creando...' : '+ Crear entrega'}
              </button>
            )}
          </div>

          <div>
            <div className="text-xs text-faint mb-1">Tareas pendientes</div>
            <div className={`text-sm font-medium ${pendingTasks > 0 ? 'text-body' : 'text-dim'}`}>
              {pendingTasks > 0 ? `${pendingTasks} tarea${pendingTasks > 1 ? 's' : ''}` : 'Sin tareas'}
            </div>
          </div>
        </div>
      </Section>

      {/* Tareas del cliente */}
      {tareas.length > 0 && (
        <Section title="Tareas">
          <div className="space-y-2">
            {tareas.map(t => (
              <div key={t.id} className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
                    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))
                    setPendingTasks(prev => t.done ? prev + 1 : prev - 1)
                  }}
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    t.done ? 'bg-gold border-gold' : 'border-line hover:border-gold'
                  }`}
                >
                  {t.done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <button
                  onClick={() => navigate('/tareas')}
                  className="flex-1 min-w-0 text-left group"
                >
                  <p className={`text-sm truncate group-hover:text-gold transition-colors ${t.done ? 'line-through text-faint' : 'text-body'}`}>
                    {t.title}
                  </p>
                  {(t.assigned_to || t.due_date) && (
                    <p className="text-xs text-muted mt-0.5">
                      {t.assigned_to === 'santi' ? 'Santi' : 'Matías'}
                      {t.due_date && ` · ${t.due_date}`}
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Log de actividad */}
      {actividad.length > 0 && (
        <Section title="Actividad">
          <div className="space-y-3">
            {actividad.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  ev.icon === 'pago' ? 'bg-green-50' :
                  ev.icon === 'entregado' ? 'bg-green-50' :
                  'bg-subtle'
                }`}>
                  {ev.icon === 'pago'      && <CreditCard size={12} className="text-green-600" />}
                  {ev.icon === 'entrega'   && <Package size={12} className="text-muted" />}
                  {ev.icon === 'entregado' && <Package size={12} className="text-green-600" />}
                  {ev.icon === 'lead'      && <Tag size={12} className="text-muted" />}
                </div>
                <div>
                  <div className="text-sm text-body">{ev.text}</div>
                  <div className="text-xs text-faint mt-0.5">
                    {safeFormatDatetime(ev.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Notas */}
      <Section title="Notas internas">
        <textarea
          value={notes}
          onChange={handleNotesChange}
          rows={4}
          placeholder="Notas del equipo sobre este cliente..."
          className="w-full text-sm text-body border border-line rounded-xl px-3 py-2.5 outline-none focus:border-strong transition-colors resize-none placeholder:text-dim"
        />
        <p className="text-xs text-dim mt-1">Se guarda automáticamente</p>
      </Section>

      {/* Navegación entre clientes */}
      {navBlock}

      {/* Modal editar */}
      {showEdit && (
        <ClienteModal
          cliente={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchClient() }}
        />
      )}

      {/* Confirm delete */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirmDelete(false)} />
          <div className="relative bg-card border border-line rounded-xl w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold text-body mb-2">Eliminar cliente</h2>
            <p className="text-sm text-soft mb-5">
              ¿Seguro que querés eliminar a <strong>{client.name}</strong>? Se borrarán también sus leads, pagos, tareas y entregas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2 border border-line text-sm text-soft rounded-xl hover:border-strong transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
