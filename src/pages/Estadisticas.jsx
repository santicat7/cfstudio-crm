import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUSD } from '../lib/utils'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'

const STAGE_LABEL = {
  consulta: 'Consulta',
  cotizado: 'Cotizado',
  confirmado: 'Confirmado',
  cobrado: 'Cobrado',
  cancelado: 'Cancelado',
}
const STAGE_COLOR = {
  consulta: '#AAAAAA',
  cotizado: '#FACC15',
  confirmado: '#22C55E',
  cobrado: '#15803D',
  cancelado: '#F87171',
}
const SOURCE_LABEL = { instagram: 'Instagram', web: 'Web', referido: 'Referido', otro: 'Otro' }
const SOURCE_COLOR = ['#111111', '#555555', '#888888', '#AAAAAA']

function Card({ title, value, sub }) {
  return (
    <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
      <div className="text-xs text-[#888] mb-1">{title}</div>
      <div className="text-2xl font-semibold text-[#1A1814]">{value}</div>
      {sub && <div className="text-xs text-[#AAA] mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-4">{children}</h2>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-[#1A1814] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[#555]">{p.name}: <span className="font-semibold">{typeof p.value === 'number' && p.name?.includes('$') ? formatUSD(p.value) : p.value}</span></div>
      ))}
    </div>
  )
}

export default function Estadisticas() {
  const [loading, setLoading] = useState(true)
  const [ingresosMes, setIngresosMes] = useState([])
  const [flujoCaja, setFlujoCaja] = useState([])
  const [stageData, setStageData] = useState([])
  const [sourceData, setSourceData] = useState([])
  const [sourceConversion, setSourceConversion] = useState([])
  const [totales, setTotales] = useState({ ingresos: 0, leads: 0, conversion: 0, ticketPromedio: 0 })

  useEffect(() => {
    async function fetchAll() {
      const [{ data: payments }, { data: leads }, { data: clients }, { data: expenses }] = await Promise.all([
        supabase.from('payments').select('amount, paid_at, client_id'),
        supabase.from('leads').select('stage, source, amount_quoted, client_id'),
        supabase.from('clients').select('total_price'),
        supabase.from('expenses').select('amount, date'),
      ])

      // Ingresos por mes — últimos 6 meses
      const now = new Date()
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(startOfMonth(now), 5 - i)
        return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }), total: 0 }
      })
      for (const p of payments || []) {
        if (!p.paid_at) continue
        const key = p.paid_at.slice(0, 7)
        const mes = meses.find(m => m.key === key)
        if (mes) mes.total += p.amount || 0
      }
      setIngresosMes(meses)

      // Flujo de caja — últimos 6 meses (ingresos vs gastos)
      const mesesFlujo = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(startOfMonth(now), 5 - i)
        return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }), ingresos: 0, gastos: 0, ganancia: 0 }
      })
      for (const p of payments || []) {
        if (!p.paid_at) continue
        const key = p.paid_at.slice(0, 7)
        const mes = mesesFlujo.find(m => m.key === key)
        if (mes) mes.ingresos += p.amount || 0
      }
      for (const e of expenses || []) {
        if (!e.date) continue
        const key = e.date.slice(0, 7)
        const mes = mesesFlujo.find(m => m.key === key)
        if (mes) mes.gastos += Number(e.amount) || 0
      }
      for (const m of mesesFlujo) m.ganancia = m.ingresos - m.gastos
      setFlujoCaja(mesesFlujo)

      // Stage breakdown
      const stageCounts = {}
      for (const l of leads || []) {
        stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
      }
      setStageData(
        Object.entries(stageCounts).map(([stage, count]) => ({
          name: STAGE_LABEL[stage] || stage,
          value: count,
          color: STAGE_COLOR[stage] || '#CCC',
        }))
      )

      // Source breakdown
      const sourceCounts = {}
      for (const l of leads || []) {
        if (!l.source) continue
        sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1
      }
      setSourceData(
        Object.entries(sourceCounts).map(([src, count], i) => ({
          name: SOURCE_LABEL[src] || src,
          value: count,
          color: SOURCE_COLOR[i % SOURCE_COLOR.length],
        }))
      )

      // Totales
      const totalIngresos = (payments || []).reduce((s, p) => s + (p.amount || 0), 0)
      const totalLeads = leads?.length || 0
      const confirmados = (leads || []).filter(l => l.stage === 'confirmado' || l.stage === 'cobrado').length
      const conversion = totalLeads > 0 ? Math.round((confirmados / totalLeads) * 100) : 0
      const conPrecio = (clients || []).filter(c => c.total_price > 0)
      const ticketPromedio = conPrecio.length > 0
        ? conPrecio.reduce((s, c) => s + c.total_price, 0) / conPrecio.length
        : 0

      setTotales({ ingresos: totalIngresos, leads: totalLeads, conversion, ticketPromedio })

      // Ingresos reales por client_id (pagos cobrados)
      const revenueByClient = {}
      for (const p of payments || []) {
        if (!p.client_id) continue
        revenueByClient[p.client_id] = (revenueByClient[p.client_id] || 0) + (p.amount || 0)
      }

      // Conversión por canal
      const bySource = {}
      for (const l of leads || []) {
        const src = l.source || 'otro'
        if (!bySource[src]) bySource[src] = { total: 0, converted: 0, revenue: 0 }
        bySource[src].total++
        const isConverted = l.stage === 'confirmado' || l.stage === 'cobrado'
        if (isConverted) bySource[src].converted++
        bySource[src].revenue += revenueByClient[l.client_id] || 0
      }
      setSourceConversion(
        Object.entries(bySource)
          .map(([src, d]) => ({
            source: SOURCE_LABEL[src] || src,
            total: d.total,
            converted: d.converted,
            rate: d.total > 0 ? Math.round((d.converted / d.total) * 100) : 0,
            revenue: d.revenue,
          }))
          .sort((a, b) => b.total - a.total)
      )

      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return <div className="text-center text-sm text-[#AAA] py-20">Cargando...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1A1814] mb-6">Estadísticas</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card title="Ingresos totales" value={formatUSD(totales.ingresos)} />
        <Card title="Total de leads" value={totales.leads} />
        <Card title="Tasa de conversión" value={`${totales.conversion}%`} sub="consultas → confirmado/cobrado" />
        <Card title="Ticket promedio" value={formatUSD(totales.ticketPromedio)} sub="por cliente con precio" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Ingresos por mes */}
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
          <SectionTitle>Ingresos por mes (últimos 6 meses)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ingresosMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F5' }} />
              <Bar dataKey="total" name="$ Ingresos" radius={[2, 2, 0, 0]} fill="#111" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline de leads */}
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
          <SectionTitle>Pipeline de leads por etapa</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F5' }} />
              <Bar dataKey="value" name="Leads" radius={[2, 2, 0, 0]}>
                {stageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flujo de caja mensual */}
      <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5 mb-8">
        <SectionTitle>Flujo de caja — últimos 6 meses</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={flujoCaja} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false}
              tickFormatter={v => v === 0 ? '0' : `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm px-3 py-2 text-xs shadow-sm">
                    <div className="font-medium text-[#1A1814] mb-1">{label}</div>
                    {payload.map((p, i) => (
                      <div key={i} style={{ color: p.fill }} className="flex justify-between gap-4">
                        <span>{p.name}</span>
                        <span className="font-semibold">${Number(p.value).toLocaleString('es-UY')}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
              cursor={{ fill: '#F9F9F9' }}
            />
            <Bar dataKey="ingresos" name="Ingresos" fill="#22C55E" radius={[2, 2, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos" fill="#F87171" radius={[2, 2, 0, 0]} />
            <Bar dataKey="ganancia" name="Ganancia" fill="#111111" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          {[['#22C55E', 'Ingresos'], ['#F87171', 'Gastos'], ['#111111', 'Ganancia']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
              <span className="text-xs text-[#888]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Canal de origen — pie */}
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
          <SectionTitle>Origen de leads</SectionTitle>
          {sourceData.length === 0 ? (
            <div className="text-sm text-[#AAA] py-8 text-center">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  paddingAngle={2}>
                  {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-[#555]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Conversión por canal */}
        <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
          <SectionTitle>Conversión por canal</SectionTitle>
          {sourceConversion.length === 0 ? (
            <div className="text-sm text-[#AAA] py-8 text-center">Sin datos</div>
          ) : (
            <div>
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 pb-2 border-b border-[#E0D9CE] mb-1">
                {['Canal', 'Leads', 'Conv.', 'Tasa', 'Ingresos'].map(h => (
                  <div key={h} className="text-[10px] font-semibold text-[#AAA] uppercase tracking-wider text-right first:text-left">{h}</div>
                ))}
              </div>
              {sourceConversion.map(row => (
                <div key={row.source} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 py-2.5 border-b border-[#F8F8F8] last:border-0 items-center">
                  <div className="text-sm font-medium text-[#1A1814]">{row.source}</div>
                  <div className="text-sm text-[#666] text-right">{row.total}</div>
                  <div className="text-sm text-[#666] text-right">{row.converted}</div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm ${
                      row.rate >= 50 ? 'bg-green-50 text-green-700' :
                      row.rate >= 25 ? 'bg-yellow-50 text-yellow-700' :
                      'bg-[#EDE7DC] text-[#666]'
                    }`}>
                      {row.rate}%
                    </span>
                  </div>
                  <div className="text-sm text-right font-medium text-[#1A1814]">
                    {row.revenue > 0 ? formatUSD(row.revenue) : <span className="text-[#CCC]">—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
