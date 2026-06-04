import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { ChevronRight, AlertTriangle, Info } from 'lucide-react'
import { isWithinInterval, addDays, parseISO, startOfMonth, endOfMonth } from 'date-fns'


function StatusBadge({ paid, total }) {
  if (!total) return <span className="text-xs text-[#CCC]">Sin precio</span>
  if (paid >= total) return (
    <span className="text-xs px-2 py-0.5 rounded-xl font-medium bg-green-50 text-green-700 border border-green-200">Pagado completo</span>
  )
  if (paid > 0) return (
    <span className="text-xs px-2 py-0.5 rounded-xl font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Parcialmente pagado</span>
  )
  return <span className="text-xs px-2 py-0.5 rounded-xl font-medium bg-[#EDE7DC] text-[#555]">Sin pagos</span>
}

export default function Pagos() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradoMes, setCobradoMes] = useState(0)
  const [pendienteGlobal, setPendienteGlobal] = useState(0)
  const [packages, setPackages] = useState([])
  const [openEventType, setOpenEventType] = useState(null)
  const [openDesc, setOpenDesc] = useState(null) // pkg.id con descripción abierta

  useEffect(() => {
    supabase.from('packages').select('*').eq('active', true)
      .order('event_type').order('category').order('name')
      .then(({ data }) => setPackages(data || []))
  }, [])

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
      <h1 className="text-xl font-semibold text-[#1A1814] mb-6">Pagos</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl p-5">
          <div className="text-2xl font-semibold text-[#1A1814] mb-1">
            {loading ? '—' : formatUSD(cobradoMes)}
          </div>
          <div className="text-xs text-[#888]">Total cobrado este mes</div>
        </div>
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl p-5">
          <div className={`text-2xl font-semibold mb-1 ${pendienteGlobal > 0 ? 'text-red-600' : 'text-[#1A1814]'}`}>
            {loading ? '—' : formatUSD(pendienteGlobal)}
          </div>
          <div className="text-xs text-[#888]">Total pendiente de cobro</div>
        </div>
      </div>

      {/* Client list */}
      <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-2.5 border-b border-[#E0D9CE] bg-[#F5F0E8]">
          {['Cliente', 'Total', 'Pagado', 'Pendiente', 'Estado', ''].map(h => (
            <div key={h} className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">{h}</div>
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
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-3.5 border-b border-[#E0D9CE] last:border-0 cursor-pointer transition-colors items-center ${
                  urgent ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-[#F5F0E8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1814]">{row.name}</span>
                  {urgent && <AlertTriangle size={13} className="text-yellow-600 flex-shrink-0" />}
                </div>
                <div className="text-sm text-[#666]">{formatUSD(row.total_price)}</div>
                <div className="text-sm text-[#666]">{formatUSD(row.paid)}</div>
                <div className={`text-sm font-medium ${row.pending > 0 ? 'text-[#1A1814]' : 'text-[#AAA]'}`}>
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

      {/* Paquetes */}
      {packages.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-4">Paquetes</h2>
          <div className="grid grid-cols-2 gap-4">
            {['Boda', 'Quinceañera'].map(eventType => {
              const byType = packages.filter(p => p.event_type === eventType)
              if (!byType.length) return null
              const categories = [...new Set(byType.map(p => p.category))]
              const isOpen = openEventType === eventType
              return (
                <div key={eventType} className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl overflow-hidden">
                  {/* Card header */}
                  <button
                    onClick={() => setOpenEventType(isOpen ? null : eventType)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F5F0E8] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1814] text-left">{eventType}</p>
                      <p className="text-xs text-[#888] mt-0.5">{byType.length} planes · {categories.length} categorías</p>
                    </div>
                    <ChevronRight size={16} className={`text-[#C9A96E] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Expandable content */}
                  {isOpen && (
                    <div className="border-t border-[#E0D9CE] px-5 py-4 space-y-5">
                      {categories.map(cat => (
                        <div key={cat}>
                          <p className="text-xs font-semibold text-[#C9A96E] uppercase tracking-wider mb-2">{cat}</p>
                          <div className="space-y-1.5">
                            {byType.filter(p => p.category === cat).map(pkg => {
                              const isHero = pkg.name === 'Plan 2' && pkg.category === 'Foto + Video'
                              const descOpen = openDesc === pkg.id
                              return (
                                <div key={pkg.id}
                                  className={`rounded-xl border transition-colors ${
                                    isHero
                                      ? 'border-[#C9A96E] bg-[#C9A96E]/8'
                                      : 'border-[#E0D9CE]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm ${isHero ? 'font-semibold text-[#1A1814]' : 'text-[#444]'}`}>
                                        {pkg.name}
                                        {pkg.plan_name && (
                                          <span className="ml-1.5 text-[#888] font-normal">· {pkg.plan_name}</span>
                                        )}
                                      </span>
                                      {isHero && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C9A96E] text-white font-semibold tracking-wide">
                                          Recomendado
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-semibold ${isHero ? 'text-[#8B6A35]' : 'text-[#1A1814]'}`}>
                                        {'$ ' + Number(pkg.price).toLocaleString('es-UY')}
                                      </span>
                                      {pkg.description && (
                                        <button
                                          onClick={() => setOpenDesc(descOpen ? null : pkg.id)}
                                          className="text-[#C9A96E] hover:text-[#8B6A35] transition-colors"
                                        >
                                          <Info size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {descOpen && pkg.description && (
                                    <div className="px-3 pb-2.5 text-xs text-[#666] leading-relaxed border-t border-[#E0D9CE] pt-2 whitespace-pre-line">
                                      {pkg.description}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
