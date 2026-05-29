import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, X } from 'lucide-react'

const STAGE_LABEL = {
  consulta: 'Consulta',
  cotizado: 'Cotizado',
  confirmado: 'Confirmado',
  cobrado: 'Cobrado',
  cancelado: 'Cancelado',
}

const STAGE_BADGE = {
  consulta: 'bg-[#F0F0F0] text-[#555]',
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
  sin_editar: 'bg-[#F0F0F0] text-[#555]',
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
    <div className="bg-white border border-[#E8E8E8] rounded-sm p-5">
      <div className={`text-3xl font-semibold leading-none mb-2 ${alert ? 'text-red-600' : 'text-[#111]'}`}>
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

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    eventosEsteMes: 0,
    leadsActivos: 0,
    cobrosPendientes: 0,
    entregasAtrasadas: 0,
  })
  const [proximosEventos, setProximosEventos] = useState([])
  const [eventospasados, setEventosPasados] = useState([])
  const [leadsRecientes, setLeadsRecientes] = useState([])
  const [alertas, setAlertas] = useState([])
  const [alertasDismissed, setAlertasDismissed] = useState(false)
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

      <h1 className="text-xl font-semibold text-[#111] mb-6">Dashboard</h1>

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
        <h2 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3">
          Próximos eventos
        </h2>
        <div className="bg-white border border-[#E8E8E8] rounded-sm divide-y divide-[#F0F0F0]">
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
                    <div className="text-sm font-medium text-[#111]">{client.name}</div>
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

      {/* Eventos pasados */}
      {(eventospasados.length > 0 || loading) && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3">
            Eventos pasados — seguimiento
          </h2>
          <div className="bg-white border border-[#E8E8E8] rounded-sm divide-y divide-[#F0F0F0]">
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
                      <div className="text-sm font-medium text-[#111]">{client.name}</div>
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
                        <span className="text-xs px-2 py-0.5 rounded-sm bg-[#F0F0F0] text-[#AAA]">Sin entrega</span>
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
        <h2 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3">
          Leads recientes
        </h2>
        <div className="bg-white border border-[#E8E8E8] rounded-sm divide-y divide-[#F0F0F0]">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-[#AAA]">Cargando...</div>
          ) : leadsRecientes.length === 0 ? (
            <EmptyState text="Todavía no hay leads cargados" />
          ) : (
            leadsRecientes.map(lead => (
              <div key={lead.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-[#111]">{lead.clients?.name}</div>
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
