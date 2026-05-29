import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Search, ChevronRight, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ClienteModal from '../components/ClienteModal'

const EVENT_TYPES = ['Boda', 'Quinceañera', 'Book', 'Cumpleaños', 'Otro']

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

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return format(new Date(dateStr + 'T12:00:00'), "d MMM yyyy", { locale: es })
}

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [showModal, setShowModal] = useState(false)

  function exportCSV() {
    const rows = [
      ['Nombre', 'Tipo', 'Fecha', 'Paquete', 'Estado lead', 'Entrega'],
      ...filtered.map(c => [
        c.name,
        c.event_type || '',
        c.event_date || '',
        c.package || '',
        c.leads?.[0]?.stage || '',
        c.deliveries?.[0]?.status || '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, event_type, event_date, package, visit_count, deliveries(status), leads(stage)')
      .order('event_date', { ascending: true })
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtered = clientes.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType ? c.event_type === filterType : true
    const matchStage = filterStage ? c.leads?.[0]?.stage === filterStage : true
    return matchSearch && matchType && matchStage
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1A1814]">Clientes</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-[#D9D9D9] text-sm text-[#666] px-4 py-2 rounded-xl hover:border-[#1A1814] hover:text-[#1A1814] transition-colors"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1A1814] transition-colors"
          >
            <Plus size={14} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-8 pr-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors"
        >
          <option value="">Todos los tipos</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors"
        >
          <option value="">Todos los estados</option>
          <option value="consulta">Consulta</option>
          <option value="cotizado">Cotizado</option>
          <option value="confirmado">Confirmado</option>
          <option value="cobrado">Cobrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-[#E0D9CE] bg-[#F5F0E8]">
          {['Nombre', 'Tipo', 'Fecha', 'Paquete', 'Entrega', ''].map(h => (
            <div key={h} className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[#AAA]">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#AAA]">
            {search || filterType ? 'Sin resultados para esa búsqueda' : 'Todavía no hay clientes cargados'}
          </div>
        ) : (
          filtered.map(c => {
            const delivery = c.deliveries?.[0]
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/clientes/${c.id}`)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 border-b border-[#E0D9CE] last:border-0 hover:bg-[#F5F0E8] cursor-pointer transition-colors items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1814]">{c.name}</span>
                  {c.visit_count > 1 && (() => {
                    const v = c.visit_count
                    const cls = v >= 8 ? 'bg-purple-900 text-white border-purple-900'
                      : v >= 6 ? 'bg-purple-700 text-white border-purple-700'
                      : v >= 4 ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-purple-100 text-purple-700 border-purple-300'
                    return (
                      <span className={`text-xs px-1.5 py-0.5 rounded-xl border font-medium flex-shrink-0 ${cls}`}>
                        #{v}
                      </span>
                    )
                  })()}
                </div>
                <div className="text-sm text-[#666]">{c.event_type || '—'}</div>
                <div className="text-sm text-[#666]">{formatDate(c.event_date)}</div>
                <div className="text-sm text-[#666]">{c.package || '—'}</div>
                <div>
                  {delivery ? (
                    <span className={`text-xs px-2 py-0.5 rounded-xl font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                      {DELIVERY_LABEL[delivery.status]}
                    </span>
                  ) : (
                    <span className="text-sm text-[#CCC]">—</span>
                  )}
                </div>
                <ChevronRight size={14} className="text-[#CCC]" />
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <ClienteModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchClientes() }}
        />
      )}
    </div>
  )
}
