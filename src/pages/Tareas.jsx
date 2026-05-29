import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getAssignee } from '../lib/utils'
import { Plus, X, Trash2 } from 'lucide-react'
import { format, isPast, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

const ASSIGNEE_LABEL = { santi: 'Santi', matias: 'Matías' }
const ASSIGNEE_BADGE = {
  santi:  'bg-[#EDE7DC] text-[#555]',
  matias: 'bg-[#EDE7DC] text-[#555]',
}


function formatDue(dateStr) {
  if (!dateStr) return null
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Hoy'
  return format(d, "d MMM", { locale: es })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const d = parseISO(dateStr)
  return isPast(d) && !isToday(d)
}

function NuevaTareaModal({ clientes, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_id: '', title: '', assigned_to: 'santi', due_date: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const filtered = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio.'); return }
    setLoading(true)
    const { error: err } = await supabase.from('tasks').insert({
      client_id: form.client_id || null,
      title: form.title.trim(),
      assigned_to: form.assigned_to,
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
      done: false,
    })
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">Nueva tarea</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Título *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
              placeholder="Ej: Enviar contrato, editar galería..."
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Cliente</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors mb-1" />
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
              size={Math.min(filtered.length + 1, 5)}
              className="w-full px-3 py-1 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7]">
              <option value="">— Sin cliente —</option>
              {filtered.map(c => <option key={c.id} value={c.id}>{c.name}{c.event_type ? ` · ${c.event_type}` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Asignado a</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
                <option value="santi">Santi</option>
                <option value="matias">Matías</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Fecha límite</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
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
              {loading ? 'Guardando...' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'mias', label: 'Mis tareas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'completadas', label: 'Completadas' },
]

export default function Tareas() {
  const { session } = useAuth()
  const [tasks, setTasks] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas')
  const [showModal, setShowModal] = useState(false)

  const myAssignee = getAssignee(session?.user?.email)

  const fetchTasks = useCallback(async () => {
    const [{ data: ts }, { data: cs }] = await Promise.all([
      supabase.from('tasks').select('*, clients(name, event_type)').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('clients').select('id, name, event_type').order('name'),
    ])
    setTasks(ts || [])
    setClientes(cs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function toggleDone(task) {
    const updated = !task.done
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: updated } : t))
    await supabase.from('tasks').update({ done: updated }).eq('id', task.id)
  }

  // Apply filter
  let filtered = tasks
  if (filter === 'mias') filtered = tasks.filter(t => t.assigned_to === myAssignee)
  if (filter === 'pendientes') filtered = tasks.filter(t => !t.done)
  if (filter === 'completadas') filtered = tasks.filter(t => t.done)

  // Group by client
  const groups = {}
  for (const t of filtered) {
    const key = t.client_id || '__sin_cliente__'
    const label = t.clients?.name
      ? `${t.clients.name}${t.clients.event_type ? ` · ${t.clients.event_type}` : ''}`
      : 'Sin cliente'
    if (!groups[key]) groups[key] = { label, tasks: [] }
    groups[key].tasks.push(t)
  }

  const pendingCount = tasks.filter(t => !t.done).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1814]">Tareas</h1>
          {pendingCount > 0 && (
            <p className="text-xs text-[#888] mt-0.5">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1A1814] transition-colors"
        >
          <Plus size={14} />
          Nueva tarea
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filter === f.id ? 'bg-[#1A1814] text-white' : 'bg-[#FDFBF7] border border-[#D9D9D9] text-[#666] hover:border-[#1A1814]'
            }`}>
            {f.id === 'mias' ? `Mis tareas (${myAssignee === 'santi' ? 'Santi' : 'Matías'})` : f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-sm text-[#AAA] py-16">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-[#AAA] py-16">
          {filter === 'completadas' ? 'No hay tareas completadas' :
           filter === 'pendientes' ? 'No hay tareas pendientes' :
           'No hay tareas todavía'}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([key, group]) => (
            <div key={key}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-2">
                {group.label}
              </h2>
              <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl divide-y divide-[#E0D9CE]">
                {group.tasks.map(task => {
                  const overdue = isOverdue(task.due_date) && !task.done
                  const dueLabel = formatDue(task.due_date)
                  return (
                    <div key={task.id} className={`flex items-start gap-3 px-4 py-3 ${task.done ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => toggleDone(task)}
                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-xl border transition-colors ${
                          task.done
                            ? 'bg-[#1A1814] border-[#1A1814]'
                            : 'border-[#D9D9D9] hover:border-[#1A1814]'
                        } flex items-center justify-center`}
                      >
                        {task.done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className={`text-sm text-[#1A1814] ${task.done ? 'line-through' : 'font-medium'}`}>
                          {task.title}
                        </div>
                        {task.notes && (
                          <div className="text-xs text-[#888] mt-0.5">{task.notes}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.assigned_to && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-xl ${ASSIGNEE_BADGE[task.assigned_to]}`}>
                            {ASSIGNEE_LABEL[task.assigned_to]}
                          </span>
                        )}
                        {dueLabel && (
                          <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-[#AAA]'}`}>
                            {dueLabel}
                          </span>
                        )}
                        <button
                          onClick={async () => {
                            await supabase.from('tasks').delete().eq('id', task.id)
                            fetchTasks()
                          }}
                          className="text-[#DDD] hover:text-red-400 transition-colors ml-1"
                          title="Eliminar tarea"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NuevaTareaModal
          clientes={clientes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchTasks() }}
        />
      )}
    </div>
  )
}
