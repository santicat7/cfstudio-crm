import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronDown } from 'lucide-react'

const EVENT_TYPES = ['Boda', 'Quinceañera', 'Book', 'Cumpleaños', 'Otro']

const EMPTY = {
  name: '', phone: '', email: '', instagram: '',
  event_type: 'Boda', event_date: '', event_time: '', package: '', total_price: '',
}

function formatPesos(n) {
  if (!n) return ''
  return '$ ' + Number(n).toLocaleString('es-UY', { maximumFractionDigits: 0 })
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
          event_time: cliente.event_time || '',
          package: cliente.package || '',
          total_price: cliente.total_price ?? '',
        }
      : EMPTY
  )
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('packages').select('*').eq('active', true).order('event_type').order('category').order('name')
      .then(({ data }) => setPackages(data || []))
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Paquetes filtrados por tipo de evento
  const filteredPackages = ['Boda', 'Quinceañera'].includes(form.event_type)
    ? packages.filter(p => p.event_type === form.event_type)
    : []

  // Agrupar por categoría
  const grouped = filteredPackages.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  function handlePackageSelect(pkg) {
    set('package', `${pkg.category} · ${pkg.name}`)
    set('total_price', pkg.price)
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
      event_time: form.event_time.trim() || null,
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
      <div className="relative bg-[#FDFBF7] dark:bg-[#232019] border border-[#E0D9CE] dark:border-[#2E2923] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#1A1814] dark:text-[#C8C0B4]">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-[#888] dark:text-[#7A7068] hover:text-[#1A1814] dark:text-[#C8C0B4] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold text-[#C9A96E] uppercase tracking-wider mb-3">Contacto</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
                  className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+598 99 000 000"
                    className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
                </div>
                <div>
                  <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Instagram</label>
                  <input type="text" value={form.instagram} onChange={e => set('instagram', e.target.value)}
                    placeholder="@usuario"
                    className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
              </div>
            </div>
          </div>

          {/* Evento */}
          <div>
            <p className="text-xs font-semibold text-[#C9A96E] uppercase tracking-wider mb-3">Evento</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Tipo</label>
                  <div className="relative">
                    <select value={form.event_type} onChange={e => { set('event_type', e.target.value); set('package', ''); set('total_price', '') }}
                      className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] bg-[#FDFBF7] dark:bg-[#232019] transition-colors appearance-none">
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] dark:text-[#7A7068] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Fecha</label>
                  <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                    className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Horario</label>
                <input type="text" value={form.event_time} onChange={e => set('event_time', e.target.value)}
                  placeholder="ej: 18:00"
                  className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
              </div>
            </div>
          </div>

          {/* Paquete */}
          <div>
            <p className="text-xs font-semibold text-[#C9A96E] uppercase tracking-wider mb-3">Paquete</p>

            {Object.keys(grouped).length > 0 && (
              <div className="space-y-3 mb-3">
                {Object.entries(grouped).map(([category, plans]) => (
                  <div key={category}>
                    <p className="text-xs text-[#888] dark:text-[#7A7068] mb-1.5">{category}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {plans.map(pkg => {
                        const isSelected = form.package === `${pkg.category} · ${pkg.name}`
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => handlePackageSelect(pkg)}
                            className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-center transition-colors ${
                              isSelected
                                ? 'border-[#C9A96E] bg-[#C9A96E]/10 text-[#1A1814] dark:text-[#C8C0B4]'
                                : 'border-[#E0D9CE] dark:border-[#2E2923] hover:border-[#C9A96E] text-[#666] dark:text-[#998E88]'
                            }`}
                          >
                            <span className="text-xs font-semibold">{pkg.name}</span>
                            {pkg.plan_name && (
                              <span className="text-[10px] text-[#888] dark:text-[#7A7068] leading-tight">{pkg.plan_name}</span>
                            )}
                            <span className="text-xs mt-0.5" style={{ color: '#8B6A35' }}>
                              {formatPesos(pkg.price)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Paquete seleccionado</label>
                <input type="text" value={form.package} onChange={e => set('package', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
              </div>
              <div>
                <label className="block text-xs text-[#888] dark:text-[#7A7068] mb-1">Precio ($)</label>
                <input type="number" value={form.total_price} onChange={e => set('total_price', e.target.value)}
                  min="0" placeholder="0"
                  className="w-full px-3 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#1A1814] dark:text-[#C8C0B4] rounded-xl outline-none focus:border-[#1A1814] transition-colors bg-[#FDFBF7] dark:bg-[#232019]" />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E0D9CE] dark:border-[#2E2923] text-sm text-[#666] dark:text-[#998E88] rounded-xl hover:border-[#1A1814] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1814] text-white text-sm rounded-xl hover:bg-[#2C2620] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
