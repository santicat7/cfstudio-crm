import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

const EVENT_TYPES = ['Boda', 'Quinceañera', 'Book', 'Cumpleaños', 'Otro']
const PACKAGES = ['Foto', 'Video', 'Foto + Video', 'Foto + Video + Album', 'Otro']

const EMPTY = {
  name: '', phone: '', email: '', instagram: '',
  event_type: 'Boda', event_date: '', package: '', total_price: '',
}

export default function ClienteModal({ cliente, onClose, onSaved }) {
  const isEdit = !!cliente
  const [form, setForm] = useState(
    isEdit
      ? {
          name: cliente.name || '',
          phone: cliente.phone || '',
          email: cliente.email || '',
          instagram: cliente.instagram || '',
          event_type: cliente.event_type || 'Boda',
          event_date: cliente.event_date || '',
          package: cliente.package || '',
          total_price: cliente.total_price ?? '',
        }
      : EMPTY
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      instagram: form.instagram.trim() || null,
      event_type: form.event_type || null,
      event_date: form.event_date || null,
      package: form.package || null,
      total_price: form.total_price !== '' ? Number(form.total_price) : null,
    }

    const { error: err } = isEdit
      ? await supabase.from('clients').update(payload).eq('id', cliente.id)
      : await supabase.from('clients').insert(payload)

    if (err) {
      setError('Error al guardar. Revisá los datos.')
      setLoading(false)
      return
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-[#FDFBF7] border border-[#E0D9CE] rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814]">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1A1814] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold text-[#AAA] uppercase tracking-wider mb-3">Contacto</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Nombre *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
                  className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+598 99 000 000"
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Instagram</label>
                  <input type="text" value={form.instagram} onChange={e => set('instagram', e.target.value)}
                    placeholder="@usuario"
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
              </div>
            </div>
          </div>

          {/* Evento */}
          <div>
            <p className="text-xs font-semibold text-[#AAA] uppercase tracking-wider mb-3">Evento</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Tipo</label>
                  <select value={form.event_type} onChange={e => set('event_type', e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Fecha</label>
                  <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Paquete</label>
                  <select value={form.package} onChange={e => set('package', e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] bg-[#FDFBF7] transition-colors">
                    <option value="">Sin paquete</option>
                    {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">Precio total (USD)</label>
                  <input type="number" value={form.total_price} onChange={e => set('total_price', e.target.value)}
                    min="0" placeholder="0"
                    className="w-full px-3 py-2 border border-[#D9D9D9] text-sm text-[#1A1814] rounded-sm outline-none focus:border-[#1A1814] transition-colors" />
                </div>
              </div>
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
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
