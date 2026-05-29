import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const STAGE_LABEL = {
  consulta: 'Consulta',
  cotizado: 'Cotizado',
  confirmado: 'Confirmado',
  cobrado: 'Cobrado',
  cancelado: 'Cancelado',
}

const STAGE_BADGE = {
  consulta: 'bg-[#EDE7DC] text-[#555]',
  cotizado: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border border-green-200',
  cobrado: 'bg-green-50 text-green-800 border border-green-300',
  cancelado: 'bg-red-50 text-red-600 border border-red-200',
}

const DELIVERY_LABEL = {
  sin_editar: 'Sin editar',
  editando: 'Editando',
  revision: 'En revisión',
  entregado: 'Entregado',
}

const DELIVERY_BADGE = {
  sin_editar: 'bg-[#EDE7DC] text-[#555]',
  editando: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  revision: 'bg-yellow-50 text-yellow-800 border border-yellow-300',
  entregado: 'bg-green-50 text-green-700 border border-green-200',
}

const SOURCE_LABEL = {
  instagram: 'Instagram',
  web: 'Web',
  referido: 'Referido',
  otro: 'Otro',
}


function MetricCard({ label, value, alert, loading }) {
  return (
    <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
      <div className={`text-3xl font-semibold leading-none mb-2 ${alert ? 'text-red-600' : 'text-[#1A1814]'}`}>
        {loading ? '—' : value}
      </div>
      <div className="text-xs text-[#888]">{label}</div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="py-8 text-center text-sm text-[#AAA]">{text}</div>
  )
}

function formatMoney(n) {
  return '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    eventosEsteMes: 0,
    leadsActivos: 0,
    cobrosPendientes: 0,
    entregasAtrasadas: 0,
  })
  const [finanzasMes, setFinanzasMes] = useState({ ingresos: 0, gastos: 0 })
  const [meta, setMeta] = useState(null)
  const [metaInput, setMetaInput] = useState('')
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [proximosEventos, setProximosEventos] = useState([])
  const [eventospasados, setEventosPasados] = useState([])
  const [leadsRecientes, setLeadsRecientes] = useState([])
  const [alertas, setAlertas] = useState([])
  const [alertasDismissed, setAlertasDismissed] = useState(false)
  const [alertasEntregas, setAlertasEntregas] = useState([])
  const [alertasEntregasDismissed, setAlertasEntregasDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const today = new Date()
      const monthStart = startOfMonth(today).toISOString().split('T')[0]
      const monthEnd = endOfMonth(today).toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]
      const tomorrowStr = addDays(today, 1).toISOString().split('T')[0]

      const [
        { data: clientsThisMonth },
        { data: activeLeads },
        { data: allClients },
        { data: allPayments },
        { data: lateDeliveries },
        { data: upcomingClients },
        { data: recentLeads },
        { data: tomorrowClients },
        { data: allPaymentsForAlert },
        { data: pastClients },
        { data: paymentsThisMonth },
        { data: expensesThisMonth },
        { data: upcomingDeliveries },
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id')
          .gte('event_date', monthStart)
          .lte('event_date', monthEnd),

        supabase
          .from('leads')
          .select('id')
          .not('stage', 'in', '("cobrado","cancelado")'),

        supabase
          .from('clients')
          .select('id, total_price'),

        supabase
          .from('payments')
          .select('client_id, amount'),

        supabase
          .from('deliveries')
          .select('id')
          .lt('promised_at', todayStr)
          .neq('status', 'entregado'),

        supabase
          .from('clients')
          .select('id, name, event_type, event_date, deliveries(status)')
          .gte('event_date', todayStr)
          .order('event_date', { ascending: true })
          .limit(3),

        supabase
          .from('leads')
          .select('id, stage, source, amount_quoted, created_at, clients(name, event_type)')
          .order('created_at', { ascending: false })
          .limit(3),

        // Clientes con evento mañana
        supabase
          .from('clients')
          .select('id, name, event_type, total_price')
          .eq('event_date', tomorrowStr),

        // Todos los pagos
        supabase
          .from('payments')
          .select('client_id, amount'),

        // Eventos pasados (últimos 90 días)
        supabase
          .from('clients')
          .select('id, name, event_type, event_date, total_price, deliveries(status), payments:payments(amount)')
          .lt('event_date', todayStr)
          .gte('event_date', format(addDays(today, -90), 'yyyy-MM-dd'))
          .order('event_date', { ascending: false })
          .limit(10),

        // Pagos del mes
        supabase
          .from('payments')
          .select('amount, paid_at')
          .gte('paid_at', monthStart)
          .lte('paid_at', monthEnd),

        // Gastos del mes
        supabase
          .from('expenses')
          .select('amount, date')
          .gte('date', monthStart)
          .lte('date', monthEnd),

        // Entregas próximas a vencer (próximos 7 días, no entregadas)
        supabase
          .from('deliveries')
          .select('id, promised_at, status, clients(id, name, event_type)')
          .gte('promised_at', todayStr)
          .lte('promised_at', addDays(today, 7).toISOString().split('T')[0])
          .neq('status', 'entregado')
          .order('promised_at', { ascending: true }),
      ])

      // Cobros pendientes
      const totalByClient = {}
      for (const c of allClients || []) {
        totalByClient[c.id] = c.total_price || 0
      }
      const paidByClient = {}
      for (const p of allPayments || []) {
        paidByClient[p.client_id] = (paidByClient[p.client_id] || 0) + (p.amount || 0)
      }
      const cobrosPendientes = Object.entries(totalByClient).reduce((acc, [id, total]) => {
        const paid = paidByClient[id] || 0
        const pending = total - paid
        return acc + (pending > 0 ? pending : 0)
      }, 0)

      setMetrics({
        eventosEsteMes: clientsThisMonth?.length ?? 0,
        leadsActivos: activeLeads?.length ?? 0,
        cobrosPendientes,
        entregasAtrasadas: lateDeliveries?.length ?? 0,
      })

      setAlertasEntregas(upcomingDeliveries || [])

      const ingresos = (paymentsThisMonth || []).reduce((s, p) => s + (p.amount || 0), 0)
      const gastos = (expensesThisMonth || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
      setFinanzasMes({ ingresos, gastos })

      const mesKey = format(today, 'yyyy-MM')
      const { data: goalData } = await supabase.from('goals').select('*').eq('month', mesKey).maybeSingle()
      setMeta(goalData || null)
      setMetaInput(goalData?.target?.toString() || '')

      // Alertas: evento mañana con saldo pendiente
      const paidMap = {}
      for (const p of allPaymentsForAlert || []) {
        paidMap[p.client_id] = (paidMap[p.client_id] || 0) + (p.amount || 0)
      }
      const alertasFiltradas = (tomorrowClients || []).filter(c => {
        const total = c.total_price || 0
        const paid = paidMap[c.id] || 0
        return total > 0 && paid < total
      })
      setAlertas(alertasFiltradas)

      setProximosEventos(upcomingClients || [])
      setEventosPasados(pastClients || [])
      setLeadsRecientes(recentLeads || [])
      setLoading(false)
    }

    fetchAll()
  }, [])

  async function saveMeta() {
    const value = parseFloat(metaInput)
    if (!value || value <= 0) return
    setSavingMeta(true)
    const mesKey = format(new Date(), 'yyyy-MM')
    const { data } = await supabase
      .from('goals')
      .upsert({ month: mesKey, target: value }, { onConflict: 'month' })
      .select()
      .single()
    setMeta(data)
    setEditandoMeta(false)
    setSavingMeta(false)
  }

  return (
    <div>
      {/* Alertas evento mañana */}
      {!alertasDismissed && alertas.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-sm px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">
                  {alertas.length === 1
                    ? 'Pago pendiente — evento mañana'
                    : `${alertas.length} clientes con pago pendiente — evento mañana`}
                </p>
                <ul className="space-y-0.5">
                  {alertas.map(c => (
                    <li key={c.id} className="text-sm text-red-600">
                      <span className="font-medium">{c.name}</span>
                      {c.event_type && <> · {c.event_type}</>}
                      {c.total_price && <> · {formatUSD(c.total_price)} total</>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setAlertasDismissed(true)}
              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Alerta entregas próximas */}
      {!alertasEntregasDismissed && alertasEntregas.length > 0 && (
        <div className="mb-4 border border-yellow-200 bg-yellow-50 rounded-sm px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-700 mb-1">
                  {alertasEntregas.length === 1
                    ? 'Entrega que vence en los próximos 7 días'
                    : `${alertasEntregas.length} entregas que vencen en los próximos 7 días`}
                </p>
                <ul className="space-y-0.5">
                  {alertasEntregas.map(d => {
                    const diasRestantes = Math.ceil((new Date(d.promised_at + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
                    return (
                      <li key={d.id} className="text-sm text-yellow-700">
                        <span className="font-medium">{d.clients?.name}</span>
                        {d.clients?.event_type && <> · {d.clients.event_type}</>}
                        <span className="ml-1 font-semibold">
                          {diasRestantes === 0 ? ' · vence hoy' : diasRestantes === 1 ? ' · vence mañana' : ` · ${diasRestantes} días`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setAlertasEntregasDismissed(true)}
              className="text-yellow-400 hover:text-yellow-600 transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <h1 className="text-xl font-semibold text-[#1A1814] mb-6">Dashboard</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="Eventos este mes"
          value={metrics.eventosEsteMes}
          loading={loading}
        />
        <MetricCard
          label="Leads activos"
          value={metrics.leadsActivos}
          loading={loading}
        />
        <MetricCard
          label="Cobros pendientes"
          value={formatUSD(metrics.cobrosPendientes)}
          alert={metrics.cobrosPendientes > 0}
          loading={loading}
        />
        <MetricCard
          label="Entregas atrasadas"
          value={metrics.entregasAtrasadas}
          alert={metrics.entregasAtrasadas > 0}
          loading={loading}
        />
      </div>

      {/* Próximos eventos */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider mb-3">
          Próximos eventos
        </h2>
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] border-l-4 border-l-[#111] rounded-sm divide-y divide-[#E0D9CE]">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-[#AAA]">Cargando...</div>
          ) : proximosEventos.length === 0 ? (
            <EmptyState text="No hay eventos próximos" />
          ) : (
            proximosEventos.map(client => {
              const delivery = client.deliveries?.[0]
              return (
                <div key={client.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-[#1A1814]">{client.name}</div>
                    <div className="text-xs text-[#888] mt-0.5">
                      {client.event_type}
                      {client.event_date && (
                        <> · {format(new Date(client.event_date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}</>
                      )}
                    </div>
                  </div>
                  {delivery && (
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                      {DELIVERY_LABEL[delivery.status]}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Resumen financiero del mes */}
      {(() => {
        const { ingresos, gastos } = finanzasMes
        const ganancia = ingresos - gastos
        const total = ingresos + gastos
        const pctIngresos = total > 0 ? (ingresos / total) * 100 : 50
        return (
          <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider">
                Resumen del mes — {format(new Date(), 'MMMM yyyy', { locale: es })}
              </h2>
              {!loading && (
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-sm font-semibold justify-end ${ganancia > 0 ? 'text-green-600' : ganancia < 0 ? 'text-red-500' : 'text-[#888]'}`}>
                    {ganancia > 0 ? <TrendingUp size={15} /> : ganancia < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
                    {formatMoney(Math.abs(ganancia))}
                    <span className="text-xs font-normal text-[#888] ml-1">{ganancia > 0 ? 'ganancia' : ganancia < 0 ? 'pérdida' : ''}</span>
                  </div>
                  {ganancia > 0 && (
                    <p className="text-xs text-[#888] mt-0.5">{formatMoney(ganancia / 2)} c/u</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-[#888] mb-1">Ingresos</p>
                <p className="text-lg font-semibold text-green-600">{loading ? '—' : formatMoney(ingresos)}</p>
              </div>
              <div>
                <p className="text-xs text-[#888] mb-1">Gastos</p>
                <p className="text-lg font-semibold text-red-500">{loading ? '—' : formatMoney(gastos)}</p>
              </div>
              <div>
                <p className="text-xs text-[#888] mb-1">Ganancia</p>
                <p className={`text-lg font-semibold ${ganancia >= 0 ? 'text-[#1A1814]' : 'text-red-500'}`}>{loading ? '—' : formatMoney(ganancia)}</p>
              </div>
            </div>

            {!loading && total > 0 && (
              <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${pctIngresos}%` }}
                />
              </div>
            )}
            {!loading && total > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-green-600">Ingresos {Math.round(pctIngresos)}%</span>
                <span className="text-xs text-red-500">Gastos {Math.round(100 - pctIngresos)}%</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Meta mensual */}
      {(() => {
        const { ingresos } = finanzasMes
        const target = meta?.target || 0
        const pct = target > 0 ? Math.min((ingresos / target) * 100, 100) : 0
        const falta = target > 0 ? Math.max(target - ingresos, 0) : 0
        return (
          <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider">Meta de ingresos — {format(new Date(), 'MMMM', { locale: es })}</h2>
              <button
                onClick={() => setEditandoMeta(true)}
                className="text-xs text-[#888] hover:text-[#1A1814] transition-colors"
              >
                {meta ? 'Editar' : 'Fijar meta'}
              </button>
            </div>

            {editandoMeta ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="ej: 5000"
                  value={metaInput}
                  onChange={e => setMetaInput(e.target.value)}
                  className="border border-[#E0D9CE] rounded-lg px-3 py-2 text-sm text-[#1A1814] focus:outline-none focus:border-[#1A1814] flex-1"
                  autoFocus
                />
                <button
                  onClick={saveMeta}
                  disabled={savingMeta}
                  className="bg-[#1A1814] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2C2620] transition-colors disabled:opacity-50"
                >
                  {savingMeta ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoMeta(false)}
                  className="text-sm text-[#888] hover:text-[#1A1814] px-2"
                >
                  Cancelar
                </button>
              </div>
            ) : !meta ? (
              <p className="text-sm text-[#AAA]">No hay meta fijada para este mes.</p>
            ) : (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-2xl font-semibold text-[#1A1814]">{formatMoney(ingresos)}</span>
                    <span className="text-sm text-[#888] ml-2">de {formatMoney(target)}</span>
                  </div>
                  <span className={`text-sm font-semibold ${pct >= 100 ? 'text-green-600' : 'text-[#888]'}`}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-3 bg-[#EDE7DC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-[#C9A96E]' : 'bg-[#8B6A35]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-[#888] mt-2">
                  {pct >= 100
                    ? '🎉 ¡Meta alcanzada!'
                    : `Faltan ${formatMoney(falta)} para la meta`}
                </p>
              </>
            )}
          </div>
        )
      })()}

      {/* Eventos pasados */}
      {(eventospasados.length > 0 || loading) && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider mb-3">
            Eventos pasados — seguimiento
          </h2>
          <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm divide-y divide-[#E0D9CE]">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-[#AAA]">Cargando...</div>
            ) : (
              eventospasados.map(client => {
                const delivery = client.deliveries?.[0]
                const totalPaid = (client.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
                const saldo = Math.max((client.total_price || 0) - totalPaid, 0)
                const cobradoCompleto = client.total_price > 0 && saldo === 0
                return (
                  <div key={client.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1A1814]">{client.name}</div>
                      <div className="text-xs text-[#888] mt-0.5">
                        {client.event_type}
                        {client.event_date && (
                          <> · {format(new Date(client.event_date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Entrega */}
                      {delivery ? (
                        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                          {DELIVERY_LABEL[delivery.status]}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-sm bg-[#EDE7DC] text-[#AAA]">Sin entrega</span>
                      )}
                      {/* Pago */}
                      {client.total_price > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${cobradoCompleto ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {cobradoCompleto ? 'Cobrado' : `Debe ${formatUSD(saldo)}`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Leads recientes */}
      <div>
        <h2 className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider mb-3">
          Leads recientes
        </h2>
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm divide-y divide-[#E0D9CE]">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-[#AAA]">Cargando...</div>
          ) : leadsRecientes.length === 0 ? (
            <EmptyState text="Todavía no hay leads cargados" />
          ) : (
            leadsRecientes.map(lead => (
              <div key={lead.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-[#1A1814]">{lead.clients?.name}</div>
                  <div className="text-xs text-[#888] mt-0.5">
                    {lead.clients?.event_type}
                    {lead.source && <> · {SOURCE_LABEL[lead.source]}</>}
                    {lead.amount_quoted && <> · {formatUSD(lead.amount_quoted)}</>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${STAGE_BADGE[lead.stage]}`}>
                  {STAGE_LABEL[lead.stage]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
