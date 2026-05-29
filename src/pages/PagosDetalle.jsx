import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PAYMENT_TYPES = [
  { value: 'sena', label: 'Seña' },
  { value: 'cuota', label: 'Cuota' },
  { value: 'saldo', label: 'Saldo final' },
]

const TYPE_LABEL = { sena: 'Seña', cuota: 'Cuota', saldo: 'Saldo final' }
const TYPE_BADGE = {
  sena: 'bg-[#EDE7DC] text-[#555]',
  cuota: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  saldo: 'bg-green-50 text-green-700 border border-green-200',
}


function formatDate(str) {
  if (!str) return '—'
  return format(parseISO(str), "d 'de' MMMM yyyy", { locale: es })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function PagoModal({ clientId, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'sena', amount: '', paid_at: today(), notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Ingresá un monto válido.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.from('payments').insert({
      client_id: clientId,
      type: form.type,
      amount: Number(form.amount),
      paid_at: form.paid_at || today(),
      notes: form.notes.trim() || null,
    })
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">Registrar pago</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Tipo de pago</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
              {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Monto (USD)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                min="0" placeholder="0" required
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Fecha</label>
              <input type="date" value={form.paid_at} onChange={e => set('paid_at', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Ej: transferencia banco, efectivo..."
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-sm hover:border-[#1A1814] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-sm hover:bg-[#1A1814] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PagosDetalle() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: c }, { data: ps }] = await Promise.all([
      supabase.from('clients').select('id, name, total_price').eq('id', clientId).single(),
      supabase.from('payments').select('*').eq('client_id', clientId).order('paid_at', { ascending: false }),
    ])
    setClient(c)
    setPayments(ps || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-[#AAA]">Cargando...</div>
  )
  if (!client) return (
    <div className="text-center py-20 text-sm text-[#AAA]">Cliente no encontrado.</div>
  )

  const total = client.total_price || 0
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const pending = Math.max(total - paid, 0)
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pagos')} className="p-1.5 text-[#888] hover:text-[#1A1814] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-semibold text-[#1A1814] flex-1">{client.name}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-sm hover:bg-[#1A1814] transition-colors"
        >
          <Plus size={14} />
          Registrar pago
        </button>
      </div>

      {/* Financial summary */}
      <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5 mb-4">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <div className="text-xs text-[#AAA] mb-0.5">Total paquete</div>
            <div className="text-base font-semibold text-[#1A1814]">{formatUSD(total)}</div>
          </div>
          <div>
            <div className="text-xs text-[#AAA] mb-0.5">Total pagado</div>
            <div className="text-base font-semibold text-green-700">{formatUSD(paid)}</div>
          </div>
          <div>
            <div className="text-xs text-[#AAA] mb-0.5">Saldo pendiente</div>
            <div className={`text-base font-semibold ${pending > 0 ? 'text-red-600' : 'text-[#AAA]'}`}>
              {formatUSD(pending)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-[#AAA] mb-1.5">
              <span>Progreso de cobro</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 bg-[#EDE7DC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A96E] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment history */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-3">Historial de pagos</h2>
      <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm divide-y divide-[#E0D9CE]">
        {payments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#AAA]">
            No hay pagos registrados todavía
          </div>
        ) : (
          payments.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-sm font-medium ${TYPE_BADGE[p.type]}`}>
                    {TYPE_LABEL[p.type]}
                  </span>
                  <span className="text-xs text-[#AAA]">{formatDate(p.paid_at)}</span>
                </div>
                {p.notes && <div className="text-xs text-[#888] mt-0.5">{p.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-[#1A1814]">{formatUSD(p.amount)}</div>
                <button
                  onClick={async () => {
                    await supabase.from('payments').delete().eq('id', p.id)
                    fetchData()
                  }}
                  className="text-[#DDD] hover:text-red-400 transition-colors"
                  title="Eliminar pago"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <PagoModal
          clientId={clientId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}
