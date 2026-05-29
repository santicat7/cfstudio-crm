import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, X, Upload, Image, ChevronDown, Trash2, ExternalLink } from 'lucide-react'

const CATEGORIES = [
  'Marketing',
  'Equipamiento',
  'Software',
  'Transporte',
  'Comidas',
  'Oficina',
  'Impuestos',
  'Retiro de socio',
  'Otros',
]

const PEOPLE = [
  { value: 'santiago', label: 'Santiago' },
  { value: 'matias', label: 'Matías' },
]

const CATEGORY_COLORS = {
  Marketing: 'bg-blue-100 text-blue-700',
  Equipamiento: 'bg-purple-100 text-purple-700',
  Software: 'bg-indigo-100 text-indigo-700',
  Transporte: 'bg-yellow-100 text-yellow-700',
  Comidas: 'bg-orange-100 text-orange-700',
  Oficina: 'bg-green-100 text-green-700',
  Impuestos: 'bg-red-100 text-red-700',
  'Retiro de socio': 'bg-pink-100 text-pink-700',
  Otros: 'bg-gray-100 text-gray-700',
}

function formatMoney(n) {
  return '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function Modal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: '',
    description: '',
    paid_by: '',
    notes: '',
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.category || !form.paid_by) {
      setError('Completá monto, rubro y quién pagó.')
      return
    }
    setSaving(true)
    setError(null)

    let receipt_url = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: true })
      if (uploadErr) {
        setError('Error subiendo imagen: ' + uploadErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      receipt_url = urlData.publicUrl
    }

    const { error: insertErr } = await supabase.from('expenses').insert({
      date: form.date,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description || null,
      paid_by: form.paid_by,
      notes: form.notes || null,
      receipt_url,
    })

    if (insertErr) {
      setError(insertErr.message)
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-[#111]">Nuevo gasto</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#111]"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888]">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] focus:outline-none focus:border-[#111]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888]">Monto ($)</label>
              <input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] focus:outline-none focus:border-[#111]"
              />
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">Rubro</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] focus:outline-none focus:border-[#111] appearance-none bg-white"
              >
                <option value="">Seleccionar rubro...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">Descripción</label>
            <input
              type="text"
              placeholder="ej: Facebook Ads mayo"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] focus:outline-none focus:border-[#111]"
            />
          </div>

          {/* Paid by */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">¿Quién pagó?</label>
            <div className="grid grid-cols-2 gap-2">
              {PEOPLE.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('paid_by', p.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.paid_by === p.value
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'bg-white text-[#666] border-[#E8E8E8] hover:border-[#111]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">Ticket / Factura (opcional)</label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-[#E8E8E8]" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-[#888] hover:text-[#111]"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="flex items-center justify-center gap-2 border border-dashed border-[#CCC] rounded-lg py-4 text-sm text-[#888] hover:border-[#111] hover:text-[#111] transition-colors"
              >
                <Upload size={16} />
                Subir foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">Notas (opcional)</label>
            <textarea
              rows={2}
              placeholder="Notas adicionales..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] focus:outline-none focus:border-[#111] resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#111] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Gastos() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchExpenses() }, [])

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const filtered = expenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false
    if (filterPerson && e.paid_by !== filterPerson) return false
    return true
  })

  // Balance calculation
  const totalSantiago = expenses.reduce((sum, e) => e.paid_by === 'santiago' ? sum + Number(e.amount) : sum, 0)
  const totalMatias = expenses.reduce((sum, e) => e.paid_by === 'matias' ? sum + Number(e.amount) : sum, 0)
  const totalGeneral = totalSantiago + totalMatias
  const mitad = totalGeneral / 2
  const diffSantiago = totalSantiago - mitad
  const diffMatias = totalMatias - mitad

  // By category
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#111]">Gastos</h1>
          <p className="text-sm text-[#888] mt-0.5">Gastos de la empresa por rubro</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#111] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
        >
          <Plus size={16} />
          Nuevo gasto
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
          <p className="text-xs text-[#888] mb-1">Total general</p>
          <p className="text-xl font-semibold text-[#111]">{formatMoney(totalGeneral)}</p>
          <p className="text-xs text-[#888] mt-1">Cada uno debería poner {formatMoney(mitad)}</p>
        </div>

        {[
          { name: 'Santiago', total: totalSantiago, diff: diffSantiago },
          { name: 'Matías', total: totalMatias, diff: diffMatias },
        ].map(({ name, total, diff }) => (
          <div key={name} className="bg-white border border-[#E8E8E8] rounded-xl p-4">
            <p className="text-xs text-[#888] mb-1">{name}</p>
            <p className="text-xl font-semibold text-[#111]">{formatMoney(total)}</p>
            <p className={`text-xs mt-1 font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-[#888]'}`}>
              {diff > 0
                ? `Le deben ${formatMoney(diff)}`
                : diff < 0
                ? `Debe ${formatMoney(Math.abs(diff))}`
                : 'A mano'}
            </p>
          </div>
        ))}
      </div>

      {/* By category */}
      {byCategory.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-[#888] mb-3">Por rubro</p>
          <div className="flex flex-col gap-2">
            {byCategory.map(({ cat, total }) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'}`}>
                  {cat}
                </span>
                <div className="flex-1 bg-[#F5F5F5] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#111] rounded-full"
                    style={{ width: `${totalGeneral > 0 ? (total / totalGeneral) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-[#111] font-medium w-20 text-right">{formatMoney(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-xs text-[#666] focus:outline-none focus:border-[#111] appearance-none bg-white pr-7"
          >
            <option value="">Todos los rubros</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value)}
            className="border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-xs text-[#666] focus:outline-none focus:border-[#111] appearance-none bg-white pr-7"
          >
            <option value="">Todos</option>
            {PEOPLE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
        </div>
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="text-sm text-[#888] py-8 text-center">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-[#888] py-8 text-center">No hay gastos registrados.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(exp => (
            <div key={exp.id} className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[exp.category] || 'bg-gray-100 text-gray-700'}`}>
                      {exp.category}
                    </span>
                    {exp.description && (
                      <span className="text-sm text-[#111] truncate">{exp.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#888]">
                      {format(parseISO(exp.date), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="text-xs text-[#888]">·</span>
                    <span className="text-xs text-[#888] capitalize">{exp.paid_by}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#111] flex-shrink-0">{formatMoney(exp.amount)}</span>
                {exp.receipt_url && <Image size={14} className="text-[#888] flex-shrink-0" />}
              </div>

              {expandedId === exp.id && (
                <div className="px-4 pb-4 border-t border-[#F0F0F0] pt-3 flex flex-col gap-3">
                  {exp.notes && (
                    <p className="text-sm text-[#666]">{exp.notes}</p>
                  )}
                  {exp.receipt_url && (
                    <div>
                      <img
                        src={exp.receipt_url}
                        alt="ticket"
                        className="max-h-60 object-contain rounded-lg border border-[#E8E8E8] w-full"
                      />
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-[#111] mt-1"
                      >
                        <ExternalLink size={12} /> Ver imagen completa
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 self-start"
                  >
                    <Trash2 size={13} /> Eliminar gasto
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchExpenses() }}
        />
      )}
    </div>
  )
}
