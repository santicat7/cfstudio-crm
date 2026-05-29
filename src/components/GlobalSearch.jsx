import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, Users, Kanban, CheckSquare, X } from 'lucide-react'

function useDebounce(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounced = useDebounce(query, 250)

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); setOpen(false); return }
    const q = debounced.trim().toLowerCase()
    setLoading(true)

    Promise.all([
      supabase.from('clients').select('id, name, event_type').ilike('name', `%${q}%`).limit(4),
      supabase.from('leads').select('id, client_id, stage, clients(name)').limit(100),
      supabase.from('tasks').select('id, title, client_id, clients(name)').ilike('title', `%${q}%`).eq('done', false).limit(3),
    ]).then(([{ data: clients }, { data: leads }, { data: tasks }]) => {
      const grouped = []
      const matchedLeads = (leads || []).filter(l => l.clients?.name?.toLowerCase().includes(q)).slice(0, 3)
      if (clients?.length) grouped.push({ type: 'clientes', items: clients })
      if (matchedLeads.length) grouped.push({ type: 'leads', items: matchedLeads })
      if (tasks?.length) grouped.push({ type: 'tareas', items: tasks })
      setResults(grouped)
      setOpen(grouped.length > 0)
      setLoading(false)
    })
  }, [debounced])

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function go(path) {
    setQuery('')
    setOpen(false)
    navigate(path)
  }

  const STAGE_LABEL = {
    consulta: 'Consulta', cotizado: 'Cotizado', confirmado: 'Confirmado',
    cobrado: 'Cobrado', cancelado: 'Cancelado',
  }
  const SECTION_ICON = { clientes: Users, leads: Kanban, tareas: CheckSquare }
  const SECTION_LABEL = { clientes: 'Clientes', leads: 'Leads', tareas: 'Tareas' }

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar… (Ctrl+K)"
          className="w-full pl-8 pr-7 py-1.5 text-sm border border-[#D9D9D9] bg-[#FDFBF7] text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors placeholder:text-[#BBB]"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#CCC] hover:text-[#888]">
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 w-80 bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm z-50 overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <div className="px-4 py-3 text-xs text-[#AAA]">Buscando...</div>
          ) : results.map(group => {
            const Icon = SECTION_ICON[group.type]
            return (
              <div key={group.type}>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F5F0E8] border-b border-[#E0D9CE]">
                  <Icon size={11} className="text-[#AAA]" />
                  <span className="text-[10px] font-semibold text-[#AAA] uppercase tracking-wider">
                    {SECTION_LABEL[group.type]}
                  </span>
                </div>
                {group.items.map(item => {
                  if (group.type === 'clientes') return (
                    <button key={item.id} onClick={() => go(`/clientes/${item.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F0EBE1] transition-colors text-left border-b border-[#F5F5F5] last:border-0">
                      <span className="text-sm text-[#1A1814]">{item.name}</span>
                      {item.event_type && <span className="text-xs text-[#AAA]">{item.event_type}</span>}
                    </button>
                  )
                  if (group.type === 'leads') return (
                    <button key={item.id} onClick={() => go('/leads')}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F0EBE1] transition-colors text-left border-b border-[#F5F5F5] last:border-0">
                      <span className="text-sm text-[#1A1814]">{item.clients?.name}</span>
                      {item.stage && <span className="text-xs text-[#AAA]">{STAGE_LABEL[item.stage]}</span>}
                    </button>
                  )
                  if (group.type === 'tareas') return (
                    <button key={item.id} onClick={() => go('/tareas')}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F0EBE1] transition-colors text-left border-b border-[#F5F5F5] last:border-0">
                      <span className="text-sm text-[#1A1814] truncate mr-2">{item.title}</span>
                      {item.clients?.name && <span className="text-xs text-[#AAA] flex-shrink-0">{item.clients.name}</span>}
                    </button>
                  )
                  return null
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
