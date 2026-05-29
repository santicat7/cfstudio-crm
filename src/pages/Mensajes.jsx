import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Copy, Check, Plus, Pencil, X, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Default templates seeded on first load ───────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    title: 'Primera consulta',
    stage: 'consulta',
    body: 'Hola {nombre}, gracias por escribirnos! Somos C&F Studio, fotografía y cine en Paysandú. Para tu {tipo_evento} el {fecha_evento} tenemos disponibilidad. Te paso los detalles de nuestros paquetes?',
  },
  {
    title: 'Envío de presupuesto',
    stage: 'cotizado',
    body: 'Hola {nombre}! Te mando el resumen de lo que incluye el paquete para tu {tipo_evento}: [descripción del paquete]. El valor es $ {monto}. Cualquier duda me avisás.',
  },
  {
    title: 'Confirmación de reserva',
    stage: 'confirmado',
    body: 'Hola {nombre}, confirmamos tu {tipo_evento} para el {fecha_evento}. Para reservar la fecha necesitamos la seña. Te mando los datos para la transferencia.',
  },
  {
    title: 'Recordatorio pre-evento',
    stage: 'recordatorio',
    body: 'Hola {nombre}! Te escribimos desde C&F Studio para confirmar los detalles de tu {tipo_evento} el {fecha_evento}. Cualquier cosa que necesites, acá estamos.',
  },
  {
    title: 'Entrega de galería',
    stage: 'entrega',
    body: '¡Hola {nombre}! 🎉 Ya está lista tu galería — acá te dejo el link con todas las fotos y/o videos: {link_galeria}\n\nFue un placer enorme acompañarlos en este día. Esperamos que cada foto les devuelva todo lo que sintieron.\nCualquier consulta me avisás. ¡Disfrutenla mucho!',
  },
]

const FOLLOWUP_TEMPLATES = [
  {
    title: 'Seguimiento — reseña y referidos',
    stage: 'seguimiento',
    body: '¡Hola {nombre}, cómo están! Espero que hayan podido ver todo el material con tranquilidad.\nNos encantaría saber qué les pareció. Si están conformes con el trabajo y les nace dejarnos una reseña en Google, nos ayuda un montón — es la mejor forma que tienen otros de conocernos.\nTe dejo el link directo acá: {link_google}\n\nY si tienen algún familiar o amigo que esté organizando una boda o quinceañera, nos encantaría que nos recomienden. Con mencionar que los atendimos nosotros ya es más que suficiente.\n¡Muchas gracias de verdad, fue un gusto trabajar con ustedes!',
  },
]

// ─── Variable replacement ──────────────────────────────────────────────────────
function replaceVars(body, client, delivery) {
  if (!body) return ''
  const nombre = client?.name || '{nombre}'
  const tipo = client?.event_type || '{tipo_evento}'
  const fecha = client?.event_date
    ? format(parseISO(client.event_date), "d 'de' MMMM yyyy", { locale: es })
    : '{fecha_evento}'
  const monto = client?.total_price
    ? new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(client.total_price)
    : '{monto}'
  const galeria = delivery?.gallery_url || '{link_galeria}'

  return body
    .replace(/{nombre}/g, nombre)
    .replace(/{tipo_evento}/g, tipo)
    .replace(/{fecha_evento}/g, fecha)
    .replace(/{monto}/g, monto)
    .replace(/{link_galeria}/g, galeria)
    .replace(/{link_google}/g, '{link_google}')
}

// ─── Template editor modal ─────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template
  const [title, setTitle] = useState(template?.title || '')
  const [body, setBody] = useState(template?.body || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { setError('Completá título y mensaje.'); return }
    setLoading(true)
    const payload = { title: title.trim(), body: body.trim(), stage: template?.stage || 'custom' }
    const { error: err } = isEdit
      ? await supabase.from('message_templates').update(payload).eq('id', template.id)
      : await supabase.from('message_templates').insert(payload)
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    setLoading(false)
    onSaved()
  }

  const VARS = ['{nombre}', '{tipo_evento}', '{fecha_evento}', '{monto}', '{link_galeria}', '{link_google}']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">{isEdit ? 'Editar template' : 'Nuevo template'}</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} required rows={6}
              className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors resize-none" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARS.map(v => (
                <button key={v} type="button"
                  onClick={() => setBody(b => b + v)}
                  className="text-[10px] px-1.5 py-0.5 border border-[#D9D9D9] rounded-sm text-[#666] hover:border-[#1A1814] transition-colors font-mono">
                  {v}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-sm hover:border-[#1A1814] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-sm hover:bg-[#1A1814] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Single template card ──────────────────────────────────────────────────────
function TemplateCard({ template, clients, onEdit, onDelete }) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [copied, setCopied] = useState(false)
  const [delivery, setDelivery] = useState(null)

  const client = clients.find(c => c.id === selectedClientId) || null

  // Fetch delivery when client changes
  useEffect(() => {
    if (!selectedClientId) { setDelivery(null); return }
    supabase
      .from('deliveries')
      .select('gallery_url')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setDelivery(data?.[0] || null))
  }, [selectedClientId])

  const preview = replaceVars(template.body, client, delivery)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = preview
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm p-5">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1814]">{template.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(template)}
            className="p-1.5 text-[#AAA] hover:text-[#1A1814] transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(template)}
            className="p-1.5 text-[#AAA] hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Client selector */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">Cliente</label>
        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
          className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
          <option value="">— Seleccionar cliente —</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.event_type ? ` · ${c.event_type}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">Vista previa</label>
        <div className="bg-[#F7F7F7] border border-[#EEEEEE] rounded-sm px-3 py-3 text-sm text-[#1A1814] leading-relaxed whitespace-pre-wrap min-h-[72px]">
          {preview.split(/(\{link_google\})/).map((part, i) =>
            part === '{link_google}'
              ? <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded font-mono">[pegá link de Google acá]</span>
              : part
          )}
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-medium transition-all ${
          copied
            ? 'bg-green-600 text-white'
            : 'bg-[#1A1814] text-white hover:bg-[#1A1814]'
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? '¡Copiado!' : 'Copiar mensaje'}
      </button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Mensajes() {
  const [templates, setTemplates] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedingFollowup, setSeedingFollowup] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchAll = useCallback(async () => {
    const [{ data: ts }, { data: cs }] = await Promise.all([
      supabase.from('message_templates').select('*').order('created_at'),
      supabase.from('clients').select('id, name, event_type, event_date, total_price').order('name'),
    ])
    setTemplates(ts || [])
    setClients(cs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Seed default templates if table is empty
  async function handleSeedDefaults() {
    setSeeding(true)
    await supabase.from('message_templates').insert(DEFAULT_TEMPLATES)
    await fetchAll()
    setSeeding(false)
  }

  async function handleSeedFollowup() {
    setSeedingFollowup(true)
    await supabase.from('message_templates').insert(FOLLOWUP_TEMPLATES)
    await fetchAll()
    setSeedingFollowup(false)
  }

  async function handleDelete(template) {
    await supabase.from('message_templates').delete().eq('id', template.id)
    setDeleteTarget(null)
    fetchAll()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1A1814]">Templates de mensajes</h1>
        <div className="flex items-center gap-2">
          {templates.length === 0 && !loading && (
            <button onClick={handleSeedDefaults} disabled={seeding}
              className="text-sm border border-[#D9D9D9] px-3 py-2 rounded-sm text-[#666] hover:border-[#1A1814] transition-colors disabled:opacity-50">
              {seeding ? 'Cargando...' : 'Cargar templates predefinidos'}
            </button>
          )}
          {templates.length > 0 && !loading && (
            <button onClick={handleSeedFollowup} disabled={seedingFollowup}
              className="text-sm border border-[#D9D9D9] px-3 py-2 rounded-sm text-[#666] hover:border-[#1A1814] transition-colors disabled:opacity-50">
              {seedingFollowup ? 'Agregando...' : '+ Templates de seguimiento'}
            </button>
          )}
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-[#1A1814] text-white text-sm px-4 py-2 rounded-sm hover:bg-[#1A1814] transition-colors">
            <Plus size={14} />
            Nuevo template
          </button>
        </div>
      </div>

      <p className="text-xs text-[#888] mb-6">
        Elegí un cliente para personalizar el mensaje con sus datos, luego copiá y pegalo en WhatsApp.
      </p>

      {loading ? (
        <div className="text-center text-sm text-[#AAA] py-16">Cargando...</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-sm text-[#888] mb-3">No hay templates creados todavía.</div>
          <button onClick={handleSeedDefaults} disabled={seeding}
            className="text-sm bg-[#1A1814] text-white px-4 py-2 rounded-sm hover:bg-[#1A1814] transition-colors disabled:opacity-50">
            {seeding ? 'Cargando...' : 'Cargar los 5 templates predefinidos'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              clients={clients}
              onEdit={setEditingTemplate}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* New template modal */}
      {showNewModal && (
        <TemplateModal
          onClose={() => setShowNewModal(false)}
          onSaved={() => { setShowNewModal(false); fetchAll() }}
        />
      )}

      {/* Edit template modal */}
      {editingTemplate && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => { setEditingTemplate(null); fetchAll() }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold text-[#1A1814] mb-2">Eliminar template</h2>
            <p className="text-sm text-[#666] mb-5">
              ¿Eliminar <strong>"{deleteTarget.title}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-[#D9D9D9] text-sm text-[#666] rounded-sm hover:border-[#1A1814] transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-sm hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
