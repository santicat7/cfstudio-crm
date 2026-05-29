import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatUSD } from '../lib/utils'
import { MapPin, Clock, Star, Camera, FileText, Users, ChevronRight, ChevronDown, Pencil, Check } from 'lucide-react'

function Field({ icon: Icon, label, value, onSave, multiline }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  useEffect(() => { setVal(value || '') }, [value])

  async function save() {
    await onSave(val)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-[#C9A96E] font-medium uppercase tracking-wider">
          {Icon && <Icon size={12} />}{label}
        </div>
        {multiline ? (
          <textarea
            rows={3}
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            className="border border-[#C9A96E] rounded-lg px-3 py-2 text-sm text-[#1A1814] focus:outline-none bg-[#FDFBF7] resize-none w-full"
          />
        ) : (
          <input
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            className="border border-[#C9A96E] rounded-lg px-3 py-2 text-sm text-[#1A1814] focus:outline-none bg-[#FDFBF7] w-full"
          />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-1 text-xs bg-[#1A1814] text-white px-3 py-1.5 rounded-lg">
            <Check size={12} /> Guardar
          </button>
          <button onClick={() => { setEditing(false); setVal(value || '') }} className="text-xs text-[#888] px-2">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex flex-col gap-1 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <div className="flex items-center gap-1.5 text-xs text-[#C9A96E] font-medium uppercase tracking-wider">
        {Icon && <Icon size={12} />}{label}
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm leading-relaxed ${value ? 'text-[#1A1814]' : 'text-[#CCC] italic'}`}>
          {value || 'Tocá para agregar...'}
        </p>
        <Pencil size={12} className="text-[#CCC] group-hover:text-[#C9A96E] transition-colors flex-shrink-0 mt-0.5" />
      </div>
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#FDFBF7] border border-[#E0D9CE] rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function isSameWeekend(dateA, dateB) {
  // Mismo fin de semana = diferencia <= 2 días y ambos en Vie/Sab/Dom
  const diff = Math.abs(differenceInCalendarDays(dateA, dateB))
  if (diff > 2) return false
  const weekendDays = [0, 5, 6] // Dom, Vie, Sab
  return weekendDays.includes(dateA.getDay()) && weekendDays.includes(dateB.getDay())
}

export default function HojaEvento() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('clients')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5)
      setClients(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const client = clients[idx] || null
  const nextClient = clients[idx + 1] || null

  // Verificar si el siguiente evento es el mismo fin de semana
  const showNext = nextClient && client && (() => {
    const dateA = parseISO(client.event_date)
    const dateB = parseISO(nextClient.event_date)
    return isSameWeekend(dateA, dateB)
  })()

  useEffect(() => {
    if (!client) return
    supabase
      .from('payments')
      .select('amount, type, paid_at')
      .eq('client_id', client.id)
      .order('paid_at', { ascending: false })
      .then(({ data }) => setPayments(data || []))
  }, [client])

  async function updateField(field, value) {
    await supabase.from('clients').update({ [field]: value }).eq('id', client.id)
    setClients(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-[#AAA]">Cargando...</div>
  )

  if (!client) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-2xl">📅</p>
      <p className="text-sm font-medium text-[#1A1814]">No hay eventos próximos</p>
      <p className="text-xs text-[#888]">Cuando haya un evento agendado aparecerá aquí.</p>
    </div>
  )

  const eventDate = client.event_date ? parseISO(client.event_date) : null
  const diasRestantes = eventDate ? differenceInCalendarDays(eventDate, new Date()) : null
  const totalPagado = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const saldo = Math.max((client.total_price || 0) - totalPagado, 0)
  const whatsappUrl = client.phone
    ? `https://wa.me/${client.phone.replace(/\D/g, '')}`
    : null

  const diasLabel =
    diasRestantes === 0 ? '🎬 HOY ES EL DÍA' :
    diasRestantes === 1 ? '🗓 Mañana' :
    diasRestantes > 1 ? `En ${diasRestantes} días` :
    'Evento pasado'

  const diasColor =
    diasRestantes === 0 ? 'text-white bg-[#1A1814]' :
    diasRestantes === 1 ? 'text-[#1A1814] bg-[#C9A96E]' :
    'text-[#1A1814] bg-[#EDE7DC]'

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1814]">Hoja de evento</h1>
            <p className="text-sm text-[#888] mt-0.5">Próximo evento agendado</p>
          </div>
          <button
            onClick={() => navigate(`/clientes/${client.id}`)}
            className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#1A1814] border border-[#E0D9CE] px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver ficha completa <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-[#1A1814] rounded-xl p-6 mb-4 text-white">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#C9A96E' }}>
              {client.event_type}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-semibold">{client.name}</h2>
              {(client.visit_count || 1) > 1 && (() => {
                const v = client.visit_count
                const bg = v >= 8 ? '#581c87' : v >= 6 ? '#7e22ce' : v >= 4 ? '#a855f7' : '#e9d5ff'
                const color = v >= 4 ? 'white' : '#6b21a8'
                return (
                  <span style={{ background: bg, color }} className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                    ★ Cliente frecuente · {v}ª vez
                  </span>
                )
              })()}
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${diasColor}`}>
            {diasLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <p className="text-xs text-white/50 mb-1">Fecha</p>
            <p className="text-sm font-medium">
              {eventDate
                ? format(eventDate, "EEEE d 'de' MMMM yyyy", { locale: es })
                : '—'}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <p className="text-xs text-white/50 mb-1">Horario</p>
            <p className="text-sm font-medium">{client.event_time || <span className="text-white/30 italic text-xs">Sin horario</span>}</p>
          </div>
        </div>
      </div>

      {/* Salon + Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-3">Lugar</h3>
          <Field
            icon={MapPin}
            label="Salón"
            value={client.venue_name}
            onSave={v => updateField('venue_name', v)}
          />
          <div className="mt-3 pt-3 border-t border-[#E0D9CE]">
            <Field
              icon={MapPin}
              label="Dirección"
              value={client.venue_address}
              onSave={v => updateField('venue_address', v)}
            />
          </div>
          {client.venue_address && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(client.venue_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#C9A96E] hover:underline mt-2"
            >
              <MapPin size={11} /> Abrir en Maps
            </a>
          )}
        </Card>

        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-3">Contacto</h3>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-[#AAA] mb-0.5">Nombre</p>
              <p className="text-sm font-medium text-[#1A1814]">{client.name}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-xs text-[#AAA] mb-1">Teléfono</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#1A1814]">{client.phone}</p>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#25D36622', color: '#25D366' }}
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
            {client.package && (
              <div>
                <p className="text-xs text-[#AAA] mb-0.5">Paquete</p>
                <p className="text-sm text-[#1A1814]">{client.package}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#AAA] mb-0.5">Pago</p>
              {saldo === 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200 font-medium">Cobrado completo</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-200 font-medium">Saldo pendiente: {formatUSD(saldo)}</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Horario + Momentos clave */}
      <Card className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-4">Detalles del día</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            icon={Clock}
            label="Horario de inicio"
            value={client.event_time}
            onSave={v => updateField('event_time', v)}
          />
          <Field
            icon={Star}
            label="Personas VIP"
            value={client.vip_people}
            onSave={v => updateField('vip_people', v)}
            multiline
          />
          <Field
            icon={Camera}
            label="Momentos clave a capturar"
            value={client.key_moments}
            onSave={v => updateField('key_moments', v)}
            multiline
          />
          <Field
            icon={FileText}
            label="Notas del equipo"
            value={client.team_notes}
            onSave={v => updateField('team_notes', v)}
            multiline
          />
        </div>
      </Card>

      {/* Equipo */}
      <Card className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-4">Equipo y gear</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-[#AAA] mb-2 flex items-center gap-1"><Users size={12}/> Roles</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                <p className="text-sm text-[#1A1814]"><span className="font-medium">Santiago</span> — Foto + dirección creativa</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                <p className="text-sm text-[#1A1814]"><span className="font-medium">Matías</span> — Video + drone</p>
              </div>
            </div>
          </div>
          <Field
            icon={Camera}
            label="Gear / equipo específico"
            value={client.gear_notes}
            onSave={v => updateField('gear_notes', v)}
            multiline
          />
        </div>
      </Card>

      {/* Checklist rápido */}
      {(() => {
        const checklist = client.checklist || {}
        const claves = ['contrato', 'sena', 'cuestionario']
        const labels = { contrato: 'Contrato firmado', sena: 'Seña cobrada', cuestionario: 'Cuestionario enviado' }
        return (
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A96E] mb-3">Check previo al evento</h3>
            <div className="space-y-2">
              {claves.map(k => (
                <div key={k} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${checklist[k] ? 'bg-[#C9A96E]' : 'border border-[#E0D9CE]'}`}>
                    {checklist[k] && <Check size={9} color="white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm ${checklist[k] ? 'text-[#AAA] line-through' : 'text-[#1A1814]'}`}>{labels[k]}</span>
                </div>
              ))}
            </div>
          </Card>
        )
      })()}

      {/* Siguiente evento del fin de semana */}
      {showNext && (
        <button
          onClick={() => { setIdx(i => i + 1); setPayments([]) }}
          className="w-full mt-4 flex flex-col items-center gap-1 py-4 border border-dashed border-[#E0D9CE] rounded-xl hover:border-[#C9A96E] hover:bg-[#FDFBF7] transition-colors group"
        >
          <ChevronDown size={16} className="text-[#C9A96E]" />
          <span className="text-xs font-medium text-[#888] group-hover:text-[#1A1814] transition-colors">
            Siguiente evento del fin de semana
          </span>
          <span className="text-sm font-semibold text-[#1A1814]">
            {nextClient.name} · {nextClient.event_type}
            {nextClient.event_date && (
              <> · {format(parseISO(nextClient.event_date), "d 'de' MMMM", { locale: es })}</>
            )}
          </span>
        </button>
      )}

      {idx > 0 && (
        <button
          onClick={() => { setIdx(i => i - 1); setPayments([]) }}
          className="w-full mt-2 text-xs text-[#AAA] hover:text-[#888] transition-colors py-2"
        >
          ↑ Volver al evento anterior
        </button>
      )}
    </div>
  )
}
