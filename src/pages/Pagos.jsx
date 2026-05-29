import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { isWithinInterval, addDays, parseISO, startOfMonth, endOfMonth } from 'date-fns'


function StatusBadge({ paid, total }) {
  if (!total) return <span className="text-xs text-[#CCC]">Sin precio</span>
  if (paid >= total) return (
    <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-green-50 text-green-700 border border-green-200">Pagado completo</span>
  )
  if (paid > 0) return (
    <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Parcialmente pagado</span>
  )
  return <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-[#F0F0F0] text-[#555]">Sin pagos</span>
}

export default function Pagos() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradoMes, setCobradoMes] = useState(0)
  const [pendienteGlobal, setPendienteGlobal] = useState(0)

  useEffect(() => {
    async function fetch() {
      const [{ data: clients }, { data: payments }] = await Promise.all([
        supabase.from('clients').select('id, name, total_price, event_date'),
        supabase.from('payments').select('client_id, amount, paid_at'),
      ])

      // Paid per client
      const paidMap = {}
      for (const p of payments || []) {
        paidMap[p.client_id] = (paidMap[p.client_id] || 0) + (p.amount || 0)
      }

      // Cobrado este mes
      const now = new Date()
      const mesStart = startOfMonth(now)
      const mesEnd = endOfMonth(now)
      const cobradoEste = (payments || [])
        .filter(p => {
          if (!p.paid_at) return false
          const d = parseISO(p.paid_at)
          return d >= mesStart && d <= mesEnd
        })
        .reduce((s, p) => s + (p.amount || 0), 0)
      setCobradoMes(cobradoEste)

      // Build rows
      const built = (clients || []).map(c => {
        const paid = paidMap[c.id] || 0
        const total = c.total_price || 0
        const pending = Math.max(total - paid, 0)
        return { ...c, paid, pending }
      })

      // Sort by pending desc
      built.sort((a, b) => b.pending - a.pending)

      // Global pending
      const globalPending = built.reduce((s, r) => s + r.pending, 0)
      setPendienteGlobal(globalPending)

      setRows(built)
      setLoading(false)
    }
    fetch()
  }, [])

  const today = new Date()
  const in30 = addDays(today, 30)

  function isUrgent(row) {
    if (!row.event_date || row.pending <= 0) return false
    const d = parseISO(row.event_date)
    return isWithinInterval(d, { start: today, end: in30 })
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#111] mb-6">Pagos</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white border border-[#E8E8E8] rounded-sm p-5">
          <div className="text-2xl font-semibold text-[#111] mb-1">
            {loading ? '—' : formatUSD(cobradoMes)}
          </div>
          <div className="text-xs text-[#888]">Total cobrado este mes</div>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-sm p-5">
          <div className={`text-2xl font-semibold mb-1 ${pendienteGlobal > 0 ? 'text-red-600' : 'text-[#111]'}`}>
            {loading ? '—' : formatUSD(pendienteGlobal)}
          </div>
          <div className="text-xs text-[#888]">Total pendiente de cobro</div>
        </div>
      </div>

      {/* Client list */}
      <div className="bg-white border border-[#E8E8E8] rounded-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-2.5 border-b border-[#E8E8E8] bg-[#FAFAFA]">
          {['Cliente', 'Total', 'Pagado', 'Pendiente', 'Estado', ''].map(h => (
            <div key={h} className="text-xs font-semibold text-[#888] uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[#AAA]">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#AAA]">Sin clientes cargados</div>
        ) : (
          rows.map(row => {
            const urgent = isUrgent(row)
            return (
              <div
                key={row.id}
                onClick={() => navigate(`/pagos/${row.id}`)}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-3.5 border-b border-[#F0F0F0] last:border-0 cursor-pointer transition-colors items-center ${
                  urgent ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#111]">{row.name}</span>
                  {urgent && <AlertTriangle size={13} className="text-yellow-600 flex-shrink-0" />}
                </div>
                <div className="text-sm text-[#666]">{formatUSD(row.total_price)}</div>
                <div className="text-sm text-[#666]">{formatUSD(row.paid)}</div>
                <div className={`text-sm font-medium ${row.pending > 0 ? 'text-[#111]' : 'text-[#AAA]'}`}>
                  {formatUSD(row.pending)}
                </div>
                <StatusBadge paid={row.paid} total={row.total_price} />
                <ChevronRight size={14} className="text-[#CCC]" />
              </div>
            )
          })
        )}
      </div>

      {rows.some(r => isUrgent(r)) && (
        <p className="text-xs text-yellow-700 mt-3 flex items-center gap-1.5">
          <AlertTriangle size={11} />
          Clientes con evento en los próximos 30 días y saldo pendiente
        </p>
      )}
    </div>
  )
}
