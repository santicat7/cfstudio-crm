import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, isPast, isToday, parseISO, addDays, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ExternalLink, X, ChevronDown, Plus, Copy, Check, MessageCircle, Trash2 } from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'sin_editar', label: 'Sin editar',  badge: 'bg-[#EDE7DC] text-[#555]' },
  { value: 'editando',   label: 'Editando',    badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  { value: 'revision',   label: 'En revisión', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { value: 'entregado',  label: 'Entregado',   badge: 'bg-green-50 text-green-700 border border-green-200' },
]
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]))

const MSG_3 = (name, tipo) =>
  `Hola ${name}! Cómo están viviendo las fotos de su ${tipo}? Esperamos que estén disfrutándolas mucho. Cualquier consulta o retoque, estamos acá!`

const MSG_7 = (name, tipo) =>
  `Hola ${name}! Pasó una semana desde que recibieron las fotos de su ${tipo}. Si tienen algún pedido especial o quieren compartir cómo les quedaron los álbumes, nos encantaría verlos! Fue un placer ser parte de ese día.`

function formatDate(str) {
  if (!str) return '—'
  return format(parseISO(str), "d MMM yyyy", { locale: es })
}

function isOverdue(row) {
  if (!row.promised_at || row.status === 'entregado') return false
  return isPast(parseISO(row.promised_at)) && !isToday(parseISO(row.promised_at))
}

// ─── Popover editar estado (en curso) ────────────────────────────────────────
function EditPopover({ delivery, anchor, onClose, onSaved }) {
  const ref = useRef(null)
  const [status, setStatus] = useState(delivery.status)
  const [galleryUrl, setGalleryUrl] = useState(delivery.gallery_url || '')
  const [promisedAt, setPromisedAt] = useState(delivery.promised_at || '')
  const [saving, setSaving] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchor) {
      const r = anchor.getBoundingClientRect()
      const left = Math.min(r.left, window.innerWidth - 292)
      setPos({ top: r.bottom + 6, left: Math.max(left, 8) })
    }
  }, [anchor])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) && anchor && !anchor.contains(e.target)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchor])

  async function save() {
    setSaving(true)
    const isNowDelivered = status === 'entregado' && delivery.status !== 'entregado'
    await supabase.from('deliveries').update({
      status,
      gallery_url: galleryUrl.trim() || null,
      promised_at: promisedAt || null,
      ...(isNowDelivered ? { delivered_at: new Date().toISOString() } : {}),
    }).eq('id', delivery.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div ref={ref} className="fixed z-50 bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl w-72 p-4"
      style={{ top: pos.top, left: pos.left, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">Editar entrega</span>
        <button onClick={onClose} className="text-[#CCC] hover:text-[#888] transition-colors"><X size={13} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Estado</label>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => setStatus(s.value)}
                className={`text-xs px-2 py-1.5 rounded-xl border transition-colors text-left ${
                  status === s.value ? 'border-[#1A1814] bg-[#1A1814] text-white' : 'border-[#D9D9D9] text-[#666] hover:border-[#888]'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Link galería</label>
          <input type="url" value={galleryUrl} onChange={e => setGalleryUrl(e.target.value)}
            placeholder="Drive, WeTransfer..."
            className="w-full px-2.5 py-1.5 border border-[#D9D9D9] text-xs text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Fecha prometida</label>
          <input type="date" value={promisedAt} onChange={e => setPromisedAt(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-[#D9D9D9] text-xs text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
        </div>
        <button onClick={save} disabled={saving}
          className="w-full bg-[#1A1814] text-white text-xs py-2 rounded-xl hover:bg-[#1A1814] transition-colors disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Fila en curso ────────────────────────────────────────────────────────────
function DeliveryRow({ delivery, onUpdated }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const overdue = isOverdue(delivery)
  const statusInfo = STATUS_MAP[delivery.status] || STATUS_MAP.sin_editar

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-[#E0D9CE] last:border-0 ${overdue ? 'bg-red-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1A1814]">{delivery.clients?.name}</span>
          {overdue && <span className="text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded-xl">Atrasado</span>}
        </div>
        <div className="text-xs text-[#888] mt-0.5">{delivery.clients?.event_type}</div>
      </div>
      <div className="flex-shrink-0">
        <button ref={btnRef} onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-xl font-medium ${statusInfo.badge} hover:opacity-80 transition-opacity`}>
          {statusInfo.label}
          <ChevronDown size={10} />
        </button>
        {open && (
          <EditPopover delivery={delivery} anchor={btnRef.current}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); onUpdated() }} />
        )}
      </div>
      <div className={`text-xs flex-shrink-0 w-24 text-right ${overdue ? 'text-red-600 font-medium' : 'text-[#888]'}`}>
        {formatDate(delivery.promised_at)}
      </div>
      <div className="w-8 flex-shrink-0 flex justify-end">
        {delivery.gallery_url
          ? <a href={delivery.gallery_url} target="_blank" rel="noopener noreferrer"
              className="text-[#888] hover:text-[#1A1814] transition-colors" onClick={e => e.stopPropagation()}>
              <ExternalLink size={14} />
            </a>
          : <span className="text-[#E0E0E0]"><ExternalLink size={14} /></span>
        }
      </div>
      <button
        onClick={async () => {
          await supabase.from('deliveries').delete().eq('id', delivery.id)
          onUpdated()
        }}
        className="text-[#DDD] hover:text-red-400 transition-colors flex-shrink-0"
        title="Eliminar entrega"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ─── Botón copiar mensaje ─────────────────────────────────────────────────────
function CopyMsgBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  async function handle() {
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-all ${
        copied ? 'bg-green-600 border-green-600 text-white' : 'border-[#D9D9D9] text-[#555] hover:border-[#1A1814]'
      }`}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

// ─── Fila seguimiento (entregadas) ────────────────────────────────────────────
function SeguimientoRow({ delivery, onUpdated }) {
  const debounceRef = useRef(null)
  const [notes, setNotes] = useState(delivery.follow_up_notes || '')

  const deliveredAt = delivery.delivered_at ? parseISO(delivery.delivered_at) : null
  const daysSince = deliveredAt ? differenceInDays(new Date(), deliveredAt) : null

  const show3 = daysSince !== null && daysSince >= 3
  const show7 = daysSince !== null && daysSince >= 7

  const name = delivery.clients?.name || 'Cliente'
  const tipo = delivery.clients?.event_type || 'evento'

  function handleNotes(val) {
    setNotes(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      supabase.from('deliveries').update({ follow_up_notes: val }).eq('id', delivery.id)
    }, 800)
  }

  return (
    <div className="px-5 py-4 border-b border-[#E0D9CE] last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        {/* Info */}
        <div>
          <div className="text-sm font-medium text-[#1A1814]">{name}</div>
          <div className="text-xs text-[#888] mt-0.5">
            {tipo}
            {delivery.clients?.event_date && (
              <> · {formatDate(delivery.clients.event_date)}</>
            )}
          </div>
          {deliveredAt && (
            <div className="text-xs text-[#AAA] mt-0.5">
              Entregado {formatDate(delivery.delivered_at)}
              {daysSince !== null && <> · hace {daysSince} día{daysSince !== 1 ? 's' : ''}</>}
            </div>
          )}
        </div>

        {/* Mensajes de seguimiento + delete */}
        <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
          {daysSince !== null && daysSince < 3 && (
            <span className="text-xs text-[#AAA]">
              Mensaje 3 días en {3 - daysSince} día{3 - daysSince !== 1 ? 's' : ''}
            </span>
          )}
          {show3 && (
            <CopyMsgBtn text={MSG_3(name, tipo)} label="Mensaje seguimiento 1" />
          )}
          {show7 && (
            <CopyMsgBtn text={MSG_7(name, tipo)} label="Mensaje seguimiento 2" />
          )}
          {!show3 && daysSince === null && (
            <span className="text-xs text-[#AAA]">Sin fecha de entrega</span>
          )}
          <button
            onClick={async () => {
              await supabase.from('deliveries').delete().eq('id', delivery.id)
              onUpdated()
            }}
            className="text-[#DDD] hover:text-red-400 transition-colors mt-1"
            title="Eliminar entrega"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Nota */}
      <input
        type="text"
        value={notes}
        onChange={e => handleNotes(e.target.value)}
        placeholder="Nota de seguimiento..."
        className="w-full px-3 py-1.5 border border-[#E0D9CE] text-xs text-[#1A1814] rounded-xl outline-none focus:border-[#888] transition-colors placeholder:text-[#CCC]"
      />
    </div>
  )
}

// ─── Modal nueva entrega ──────────────────────────────────────────────────────
function NuevaEntregaModal({ onClose, onSaved }) {
  const [clientes, setClientes] = useState([])
  const [clientId, setClientId] = useState('')
  const [promisedAt, setPromisedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, name, event_type, event_date').order('name')
      .then(({ data }) => setClientes(data || []))
  }, [])

  function handleClientChange(id) {
    setClientId(id)
    const c = clientes.find(x => x.id === id)
    if (c?.event_date) setPromisedAt(format(addDays(parseISO(c.event_date), 30), 'yyyy-MM-dd'))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clientId) { setError('Elegí un cliente.'); return }
    setLoading(true)
    const { error: err } = await supabase.from('deliveries').insert({
      client_id: clientId, status: 'sin_editar', promised_at: promisedAt || null,
    })
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">Nueva entrega</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Cliente *</label>
            <select value={clientId} onChange={e => handleClientChange(e.target.value)} required
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
              <option value="">— Seleccionar cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.name}{c.event_type ? ` · ${c.event_type}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
              Fecha límite <span className="normal-case font-normal text-[#AAA]">(auto: evento +30 días)</span>
            </label>
            <input type="date" value={promisedAt} onChange={e => setPromisedAt(e.target.value)}
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-xl hover:border-[#1A1814] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-xl hover:bg-[#1A1814] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Entregas() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('en_curso')

  const fetchDeliveries = useCallback(async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, clients(id, name, event_type, event_date)')
      .order('promised_at', { ascending: true, nullsFirst: false })
    setDeliveries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDeliveries() }, [fetchDeliveries])

  const enCurso = deliveries.filter(d => d.status !== 'entregado')
  const entregadas = deliveries.filter(d => d.status === 'entregado')
  const overdue = enCurso.filter(isOverdue).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1814]">Entregas</h1>
          {overdue > 0 && tab === 'en_curso' && (
            <p className="text-xs text-red-600 mt-0.5">{overdue} atrasada{overdue > 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1A1814] transition-colors">
          <Plus size={14} />
          Nueva entrega
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        <button onClick={() => setTab('en_curso')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
            tab === 'en_curso' ? 'bg-[#1A1814] text-white' : 'bg-[#FDFBF7] border border-[#D9D9D9] text-[#666] hover:border-[#1A1814]'
          }`}>
          En curso
          {enCurso.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'en_curso' ? 'bg-[#FDFBF7]/20' : 'bg-[#EDE7DC]'}`}>
              {enCurso.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('seguimiento')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
            tab === 'seguimiento' ? 'bg-[#1A1814] text-white' : 'bg-[#FDFBF7] border border-[#D9D9D9] text-[#666] hover:border-[#1A1814]'
          }`}>
          <MessageCircle size={11} />
          Seguimiento post-entrega
          {entregadas.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'seguimiento' ? 'bg-[#FDFBF7]/20' : 'bg-[#EDE7DC]'}`}>
              {entregadas.length}
            </span>
          )}
        </button>
      </div>

      {/* En curso */}
      {tab === 'en_curso' && (
        <>
          <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-[#E0D9CE] bg-[#F5F0E8]">
              <div className="flex-1 text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">Cliente</div>
              <div className="flex-shrink-0 w-28 text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">Estado</div>
              <div className="flex-shrink-0 w-24 text-right text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">Entrega</div>
              <div className="w-8 flex-shrink-0" />
            </div>
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-[#AAA]">Cargando...</div>
            ) : enCurso.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#AAA]">
                No hay entregas en curso
              </div>
            ) : (
              enCurso.map(d => <DeliveryRow key={d.id} delivery={d} onUpdated={fetchDeliveries} />)
            )}
          </div>
          <p className="text-xs text-[#AAA] mt-3">
            Hacé click en el estado para editarlo. Al marcarlo como "Entregado" pasa automáticamente a Seguimiento.
          </p>
        </>
      )}

      {/* Seguimiento post-entrega */}
      {tab === 'seguimiento' && (
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl overflow-hidden">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-[#AAA]">Cargando...</div>
          ) : entregadas.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#AAA]">
              Todavía no hay entregas marcadas como entregadas
            </div>
          ) : (
            entregadas.map(d => <SeguimientoRow key={d.id} delivery={d} onUpdated={fetchDeliveries} />)
          )}
        </div>
      )}

      {showModal && (
        <NuevaEntregaModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchDeliveries() }}
        />
      )}
    </div>
  )
}
