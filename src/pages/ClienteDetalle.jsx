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
  sin_editar: 'bg-[#F0F0F0] text-[#555]',
  editando: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  revision: 'bg-yellow-50 text-yellow-800 border border-yellow-300',
  entregado: 'bg-green-50 text-green-700 border border-green-200',
}

const STAGE_LABEL = {
  consulta: 'Consulta', cotizado: 'Cotizado', confirmado: 'Confirmado',
  cobrado: 'Cobrado', cancelado: 'Cancelado',
}
const STAGE_BADGE = {
  consulta:   'bg-[#F0F0F0] text-[#555]',
  cotizado:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border border-green-200',
  cobrado:    'bg-green-50 text-green-800 border border-green-300',
  cancelado:  'bg-red-50 text-red-600 border border-red-200',
}
const TYPE_LABEL = { sena: 'Seña', cuota: 'Cuota', saldo: 'Saldo final' }

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
    <div className="bg-white border border-[#E8E8E8] rounded-sm p-5 mb-4">
      <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs text-[#AAA] mb-0.5">{label}</div>
      <div className="text-sm text-[#111]">{children}</div>
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
      { count: taskCount },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('deliveries').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('client_id', id).order('paid_at', { ascending: false }),
      supabase.from('leads').select('stage, created_at').eq('client_id', id).limit(1),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('client_id', id).eq('done', false),
    ])
    setClient(c)
    setNotes(c?.notes || '')
    setDelivery(deliveries?.[0] || null)
    setLastPayment(payments?.[0] || null)
    setLeadStage(leads?.[0]?.stage || null)
    setPendingTasks(taskCount || 0)

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
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-[#AAA]">
        Cargando...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-[#888]">Cliente no encontrado.</p>
        <button onClick={() => navigate('/clientes')} className="text-sm underline text-[#111]">
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
        className="flex items-center gap-2 text-sm text-[#666] border border-[#D9D9D9] px-4 py-2 rounded-sm hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ArrowLeft size={14} />
        Cliente anterior
      </button>
      <span className="text-xs text-[#AAA]">{navIdx >= 0 ? navIdx + 1 : '?'} / {allIds.length}</span>
      <button onClick={() => navigate(`/clientes/${nextId}`)} disabled={!nextId}
        className="flex items-center gap-2 text-sm text-[#666] border border-[#D9D9D9] px-4 py-2 rounded-sm hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
          className="p-1.5 text-[#888] hover:text-[#111] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-semibold text-[#111] flex-1">{client.name}</h1>
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 border border-[#D9D9D9] text-sm text-[#111] px-3 py-1.5 rounded-sm hover:border-[#111] transition-colors"
        >
          <Pencil size={13} />
          Editar
        </button>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="flex items-center gap-1.5 border border-[#D9D9D9] text-sm text-red-600 px-3 py-1.5 rounded-sm hover:border-red-300 transition-colors"
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
            <div className="text-xs text-[#AAA] mb-0.5">Teléfono</div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#111]">{client.phone}</span>
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-green-700 border border-green-200 bg-green-50 px-2.5 py-1 rounded-sm hover:bg-green-100 transition-colors"
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
            <div className="text-xs text-[#AAA] mb-0.5">Instagram</div>
            <a
              href={`https://instagram.com/${client.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[#111] underline underline-offset-2 hover:text-[#555] transition-colors w-fit"
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
          <Field label="Paquete">{client.package || '—'}</Field>
          <Field label="Precio total">{formatUSD(client.total_price)}</Field>
        </div>
        {leadStage && (
          <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex items-center gap-2">
            <span className="text-xs text-[#AAA]">Estado en pipeline:</span>
            <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${STAGE_BADGE[leadStage]}`}>
              {STAGE_LABEL[leadStage]}
            </span>
          </div>
        )}
      </Section>

      {/* Historial */}
      <Section title="Historial">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[#AAA] mb-1">Último pago</div>
            {lastPayment ? (
              <>
                <div className="text-sm font-medium text-[#111]">{formatUSD(lastPayment.amount)}</div>
                <div className="text-xs text-[#888] mt-0.5 capitalize">{lastPayment.type}</div>
              </>
            ) : (
              <div className="text-sm text-[#CCC]">Sin pagos</div>
            )}
          </div>

          <div>
            <div className="text-xs text-[#AAA] mb-1">Entrega</div>
            {delivery ? (
              <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                {DELIVERY_LABEL[delivery.status]}
              </span>
            ) : (
              <button
                onClick={handleCreateDelivery}
                disabled={creatingDelivery}
                className="text-xs border border-[#D9D9D9] px-2 py-1 rounded-sm text-[#666] hover:border-[#111] transition-colors disabled:opacity-50"
              >
                {creatingDelivery ? 'Creando...' : '+ Crear entrega'}
              </button>
            )}
          </div>

          <div>
            <div className="text-xs text-[#AAA] mb-1">Tareas pendientes</div>
            <div className={`text-sm font-medium ${pendingTasks > 0 ? 'text-[#111]' : 'text-[#CCC]'}`}>
              {pendingTasks > 0 ? `${pendingTasks} tarea${pendingTasks > 1 ? 's' : ''}` : 'Sin tareas'}
            </div>
          </div>
        </div>
      </Section>

      {/* Log de actividad */}
      {actividad.length > 0 && (
        <Section title="Actividad">
          <div className="space-y-3">
            {actividad.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  ev.icon === 'pago' ? 'bg-green-50' :
                  ev.icon === 'entregado' ? 'bg-green-50' :
                  'bg-[#F0F0F0]'
                }`}>
                  {ev.icon === 'pago'      && <CreditCard size={12} className="text-green-600" />}
                  {ev.icon === 'entrega'   && <Package size={12} className="text-[#888]" />}
                  {ev.icon === 'entregado' && <Package size={12} className="text-green-600" />}
                  {ev.icon === 'lead'      && <Tag size={12} className="text-[#888]" />}
                </div>
                <div>
                  <div className="text-sm text-[#111]">{ev.text}</div>
                  <div className="text-xs text-[#AAA] mt-0.5">
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
          className="w-full text-sm text-[#111] border border-[#E8E8E8] rounded-sm px-3 py-2.5 outline-none focus:border-[#111] transition-colors resize-none placeholder:text-[#CCC]"
        />
        <p className="text-xs text-[#CCC] mt-1">Se guarda automáticamente</p>
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
          <div className="relative bg-white border border-[#E8E8E8] rounded-sm w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold text-[#111] mb-2">Eliminar cliente</h2>
            <p className="text-sm text-[#666] mb-5">
              ¿Seguro que querés eliminar a <strong>{client.name}</strong>? Se borrarán también sus leads, pagos, tareas y entregas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-sm hover:border-[#111] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
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
