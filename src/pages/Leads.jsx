import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, X, ExternalLink, Pencil } from 'lucide-react'
import { formatUSD } from '../lib/utils'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

async function ensureDelivery(clientId, eventDate) {
  const { data: existing } = await supabase
    .from('deliveries').select('id').eq('client_id', clientId).maybeSingle()
  if (existing) return
  const promisedAt = eventDate
    ? format(addDays(parseISO(eventDate), 30), 'yyyy-MM-dd')
    : null
  await supabase.from('deliveries').insert({
    client_id: clientId, status: 'sin_editar', promised_at: promisedAt,
  })
}

const STAGES = [
  { id: 'consulta', label: 'Consulta' },
  { id: 'cotizado', label: 'Cotizado' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'cobrado', label: 'Cobrado' },
  { id: 'cancelado', label: 'Cancelado' },
]

const STAGE_ACCENT = {
  consulta: 'border-l-[#AAAAAA]',
  cotizado: 'border-l-yellow-400',
  confirmado: 'border-l-green-500',
  cobrado: 'border-l-green-700',
  cancelado: 'border-l-red-400',
}

const STAGE_BADGE = {
  consulta: 'bg-[#EDE7DC] text-[#555]',
  cotizado: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border border-green-200',
  cobrado: 'bg-green-50 text-green-800 border border-green-300',
  cancelado: 'bg-red-50 text-red-600 border border-red-200',
}

const EVENT_TYPES = ['Boda', 'Quinceañera', 'Book', 'Cumpleaños', 'Otro']
const SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'web', label: 'Web' },
  { value: 'referido', label: 'Referido' },
  { value: 'otro', label: 'Otro' },
]

const EMPTY_FORM = {
  name: '', phone: '', event_type: 'Boda', event_date: '',
  source: 'instagram', amount_quoted: '',
}


function EditLeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: lead.clients?.name || '',
    phone: lead.clients?.phone || '',
    event_type: lead.clients?.event_type || 'Boda',
    event_date: lead.clients?.event_date || '',
    source: lead.source || 'instagram',
    amount_quoted: lead.amount_quoted ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const [{ error: clientErr }, { error: leadErr }] = await Promise.all([
      supabase.from('clients').update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        event_type: form.event_type,
        event_date: form.event_date || null,
      }).eq('id', lead.client_id),
      supabase.from('leads').update({
        source: form.source,
        amount_quoted: form.amount_quoted !== '' ? Number(form.amount_quoted) : null,
      }).eq('id', lead.id),
    ])

    if (clientErr || leadErr) { setError('Error al guardar.'); setLoading(false); return }
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">Editar lead</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Nombre *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Teléfono</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Tipo de evento</label>
              <select value={form.event_type} onChange={e => set('event_type', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Fecha</label>
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Canal</label>
              <select value={form.source} onChange={e => set('source', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Monto cotizado ($)</label>
              <input type="number" value={form.amount_quoted} onChange={e => set('amount_quoted', e.target.value)}
                placeholder="0" min="0"
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-xl hover:border-[#1A1814] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-xl hover:bg-[#1A1814] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeadCard({ lead, index, onDeleted, onEdited }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  async function handleDelete(e) {
    e.stopPropagation()
    await supabase.from('leads').delete().eq('id', lead.id)
    onDeleted()
  }

  return (
    <>
      <Draggable draggableId={lead.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`
              bg-[#FDFBF7] border border-[#E0D9CE] border-l-4 ${STAGE_ACCENT[lead.stage]}
              rounded-xl p-3 mb-2 cursor-grab active:cursor-grabbing select-none
              ${snapshot.isDragging ? 'opacity-90 ring-1 ring-[#111]' : ''}
            `}
          >
            <div className="flex items-start justify-between gap-1 mb-1">
              <div className="text-sm font-medium text-[#1A1814] leading-tight">{lead.clients?.name}</div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!confirmDelete ? (
                  <>
                    <button onClick={e => { e.stopPropagation(); setShowEdit(true) }}
                      className="text-[#CCC] hover:text-[#1A1814] transition-colors mt-0.5" title="Editar">
                      <Pencil size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); navigate(`/clientes/${lead.client_id}`) }}
                      className="text-[#CCC] hover:text-[#1A1814] transition-colors mt-0.5" title="Ver ficha">
                      <ExternalLink size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                      className="text-[#CCC] hover:text-red-400 transition-colors mt-0.5">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={handleDelete} className="text-[10px] text-red-600 font-medium">Borrar</button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(false) }} className="text-[10px] text-[#888]">No</button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-[#888] mb-1">{lead.clients?.event_type}</div>
            {lead.clients?.event_date && (
              <div className="text-xs text-[#888] mb-2">
                {format(new Date(lead.clients.event_date + 'T12:00:00'), "d MMM yyyy", { locale: es })}
              </div>
            )}
            {lead.amount_quoted && (
              <div className="text-xs font-medium text-[#1A1814]">{formatUSD(lead.amount_quoted)}</div>
            )}
          </div>
        )}
      </Draggable>
      {showEdit && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onEdited() }}
        />
      )}
    </>
  )
}

function Column({ stage, leads, onDeleted, onEdited }) {
  return (
    <div className="flex flex-col w-56 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#1A1814] uppercase tracking-wider">
          {stage.label}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-xl font-medium ${STAGE_BADGE[stage.id]}`}>
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[200px] rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver ? 'bg-[#EDE7DC]' : 'bg-[#F7F7F7]'
            }`}
          >
            {leads.map((lead, idx) => (
              <LeadCard key={lead.id} lead={lead} index={idx} onDeleted={onDeleted} onEdited={onEdited} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

function NewLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Create client
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        event_type: form.event_type,
        event_date: form.event_date || null,
      })
      .select()
      .single()

    if (clientErr) {
      setError('Error al guardar. Revisá los datos.')
      setLoading(false)
      return
    }

    // 2. Create lead
    const { error: leadErr } = await supabase
      .from('leads')
      .insert({
        client_id: client.id,
        stage: 'consulta',
        source: form.source,
        amount_quoted: form.amount_quoted ? Number(form.amount_quoted) : null,
      })

    if (leadErr) {
      setError('Cliente creado pero hubo un error con el lead.')
      setLoading(false)
      return
    }

    setLoading(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">Nuevo lead</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
              Nombre *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
              Teléfono
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+598 99 000 000"
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
                Tipo de evento
              </label>
              <select
                value={form.event_type}
                onChange={e => set('event_type', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
                Fecha
              </label>
              <input
                type="date"
                value={form.event_date}
                onChange={e => set('event_date', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
                Canal
              </label>
              <select
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors"
              >
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
                Monto cotizado ($)
              </label>
              <input
                type="number"
                value={form.amount_quoted}
                onChange={e => set('amount_quoted', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-xl outline-none focus:border-[#1A1814] transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-xl hover:border-[#1A1814] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-xl hover:bg-[#1A1814] transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Leads() {
  const [leadsMap, setLeadsMap] = useState(() =>
    Object.fromEntries(STAGES.map(s => [s.id, []]))
  )
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*, clients(name, phone, event_type, event_date)')
      .order('created_at', { ascending: true })

    const map = Object.fromEntries(STAGES.map(s => [s.id, []]))
    for (const lead of data || []) {
      if (map[lead.stage]) map[lead.stage].push(lead)
    }
    setLeadsMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceStage = source.droppableId
    const destStage = destination.droppableId

    // Capture lead reference before optimistic update mutates the map
    const movedLead = leadsMap[sourceStage]?.find(l => l.id === draggableId)

    // Optimistic update
    setLeadsMap(prev => {
      const next = { ...prev }
      const sourceList = [...prev[sourceStage]]
      const destList = sourceStage === destStage ? sourceList : [...prev[destStage]]
      const [moved] = sourceList.splice(source.index, 1)
      moved.stage = destStage
      destList.splice(destination.index, 0, moved)
      next[sourceStage] = sourceStage === destStage ? destList : sourceList
      if (sourceStage !== destStage) next[destStage] = destList
      return next
    })

    await supabase.from('leads').update({ stage: destStage }).eq('id', draggableId)

    // Al confirmar o cobrar → crear entrega automática (30 días desde evento)
    if ((destStage === 'confirmado' || destStage === 'cobrado') && sourceStage !== destStage) {
      if (movedLead?.client_id) {
        await ensureDelivery(movedLead.client_id, movedLead.clients?.event_date)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1A1814]">Pipeline de leads</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1A1814] transition-colors"
        >
          <Plus size={14} />
          Nuevo lead
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#888] py-12 text-center">Cargando leads...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <Column
                key={stage.id}
                stage={stage}
                leads={leadsMap[stage.id] || []}
                onDeleted={fetchLeads}
                onEdited={fetchLeads}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {showModal && (
        <NewLeadModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchLeads() }}
        />
      )}
    </div>
  )
}
