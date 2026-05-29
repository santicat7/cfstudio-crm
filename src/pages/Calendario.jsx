import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertTriangle, X, ExternalLink } from 'lucide-react'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STAGE_STYLE = {
  consulta:   { pill: 'bg-[#AAAAAA] text-white',         dot: 'bg-[#AAAAAA]',  label: 'Consulta' },
  cotizado:   { pill: 'bg-yellow-400 text-yellow-900',   dot: 'bg-yellow-400', label: 'Cotizado' },
  confirmado: { pill: 'bg-green-500 text-white',          dot: 'bg-green-500',  label: 'Confirmado' },
  cobrado:    { pill: 'bg-green-700 text-white',          dot: 'bg-green-700',  label: 'Cobrado' },
  cancelado:  { pill: 'bg-red-400 text-white',            dot: 'bg-red-400',    label: 'Cancelado' },
  default:    { pill: 'bg-[#AAAAAA] text-white',          dot: 'bg-[#AAAAAA]',  label: '' },
}

const DELIVERY_LABEL = {
  sin_editar: 'Sin editar',
  editando: 'Editando',
  revision: 'En revisión',
  entregado: 'Entregado',
}
const DELIVERY_BADGE = {
  sin_editar: 'bg-[#F0F0F0] text-[#555]',
  editando: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  revision: 'bg-yellow-50 text-yellow-800 border border-yellow-300',
  entregado: 'bg-green-50 text-green-700 border border-green-200',
}

function getStageStyle(stage) {
  return STAGE_STYLE[stage] || STAGE_STYLE.default
}

function EventPopover({ events, onClose, anchorRef }) {
  const navigate = useNavigate()
  const ref = useRef(null)
  const hasConflict = events.length >= 2

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white border border-[#E8E8E8] rounded-sm w-72 p-4 top-full mt-1 left-0"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#888] uppercase tracking-wider">
          {events.length} evento{events.length > 1 ? 's' : ''}
        </span>
        <button onClick={onClose} className="text-[#CCC] hover:text-[#888] transition-colors">
          <X size={13} />
        </button>
      </div>

      {hasConflict && (
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs px-2.5 py-1.5 rounded-sm mb-3">
          <AlertTriangle size={12} />
          Conflicto: hay {events.length} eventos este día
        </div>
      )}

      <div className="space-y-3">
        {events.map(ev => {
          const style = getStageStyle(ev.leads?.[0]?.stage)
          const delivery = ev.deliveries?.[0]
          return (
            <div key={ev.id} className="pb-3 border-b border-[#F0F0F0] last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="text-sm font-medium text-[#111]">{ev.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-[#888]">{ev.event_type}</span>
                    {ev.leads?.[0]?.stage && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${style.pill}`}>
                        {STAGE_STYLE[ev.leads[0].stage]?.label}
                      </span>
                    )}
                    {ev.package && (
                      <span className="text-xs text-[#888]">{ev.package}</span>
                    )}
                  </div>
                </div>
              </div>

              {delivery && (
                <div className="mb-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-sm font-medium ${DELIVERY_BADGE[delivery.status]}`}>
                    {DELIVERY_LABEL[delivery.status]}
                  </span>
                </div>
              )}

              <button
                onClick={() => { navigate(`/clientes/${ev.id}`); onClose() }}
                className="flex items-center gap-1 text-xs text-[#111] underline underline-offset-2 hover:text-[#555] transition-colors"
              >
                Ver ficha completa
                <ExternalLink size={10} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayCell({ date, events, currentMonth }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState([])
  const anchorRef = useRef(null)

  const inMonth = isSameMonth(date, currentMonth)
  const isCurrentDay = isToday(date)
  const hasConflict = events.length >= 2
  const visible = events.slice(0, 2)
  const extra = events.length - 2

  function openPopover(evs) {
    setSelectedEvents(evs)
    setOpen(true)
  }

  return (
    <div
      className={`relative min-h-[96px] p-1.5 border-b border-r border-[#E8E8E8] ${
        !inMonth ? 'bg-[#F7F7F7]' : 'bg-white'
      } ${hasConflict && inMonth ? 'ring-1 ring-inset ring-red-300' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
            isCurrentDay
              ? 'bg-[#111] text-white'
              : inMonth
              ? 'text-[#111]'
              : 'text-[#CCC]'
          }`}
        >
          {format(date, 'd')}
        </span>
        {hasConflict && inMonth && (
          <AlertTriangle size={11} className="text-red-400" />
        )}
      </div>

      <div ref={anchorRef} className="space-y-0.5">
        {visible.map(ev => {
          const lead = ev.leads?.[0]
          const style = getStageStyle(lead?.stage)
          const showAmount = lead?.stage === 'consulta' && lead?.amount_quoted
          return (
            <button
              key={ev.id}
              onClick={() => navigate(`/clientes/${ev.id}`)}
              className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded-sm truncate leading-tight ${style.pill} hover:opacity-80 transition-opacity`}
            >
              {ev.name}{showAmount ? ` · $${Number(lead.amount_quoted).toLocaleString('es-UY')}` : ''}
            </button>
          )
        })}
        {extra > 0 && (
          <button
            onClick={() => openPopover(events)}
            className="text-[10px] text-[#888] hover:text-[#111] transition-colors px-1"
          >
            +{extra} más
          </button>
        )}
      </div>

      {open && (
        <EventPopover
          events={selectedEvents}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
        />
      )}
    </div>
  )
}

function WeekView({ weekStart, eventsByDate }) {
  const navigate = useNavigate()
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  })

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#E8E8E8]">
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`text-center py-3 border-r border-[#E8E8E8] last:border-0 ${
              isToday(day) ? 'bg-[#F5F5F5]' : ''
            }`}
          >
            <div className="text-xs font-semibold text-[#888] uppercase tracking-wider">
              {format(day, 'EEE', { locale: es })}
            </div>
            <div
              className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                isToday(day) ? 'bg-[#111] text-white' : 'text-[#111]'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Event columns */}
      <div className="grid grid-cols-7 divide-x divide-[#E8E8E8] min-h-[300px]">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const events = eventsByDate[key] || []
          const hasConflict = events.length >= 2
          return (
            <div
              key={key}
              className={`p-2 space-y-1.5 ${hasConflict ? 'bg-red-50/40' : ''}`}
            >
              {events.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <span className="text-xs text-[#E0E0E0]">—</span>
                </div>
              )}
              {events.map(ev => {
                const lead = ev.leads?.[0]
                const style = getStageStyle(lead?.stage)
                const delivery = ev.deliveries?.[0]
                const showAmount = lead?.amount_quoted
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/clientes/${ev.id}`)}
                    className={`w-full text-left rounded-sm px-2 py-2 hover:opacity-90 transition-opacity ${style.pill}`}
                  >
                    <div className="text-xs font-semibold leading-tight truncate">{ev.name}</div>
                    {ev.event_type && (
                      <div className="text-[10px] opacity-80 mt-0.5">{ev.event_type}</div>
                    )}
                    {showAmount && (
                      <div className="text-[10px] opacity-80 mt-0.5">
                        ${Number(lead.amount_quoted).toLocaleString('es-UY')}
                      </div>
                    )}
                    {delivery && (
                      <div className={`inline-block text-[10px] px-1 py-0.5 rounded-sm font-medium mt-1 ${DELIVERY_BADGE[delivery.status]}`}>
                        {DELIVERY_LABEL[delivery.status]}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendario() {
  const [current, setCurrent] = useState(new Date())
  const [view, setView] = useState('mes')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, event_type, event_date, package, deliveries(status), leads(stage, amount_quoted)')
      .not('event_date', 'is', null)
      .then(({ data }) => {
        setClients(data || [])
        setLoading(false)
      })
  }, [])

  // Build days grid (month view)
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Week view: start of week containing `current`
  const weekStart = startOfWeek(current, { weekStartsOn: 1 })

  // Map events by date string
  const eventsByDate = {}
  for (const c of clients) {
    const key = c.event_date
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(c)
  }

  const monthEvents = clients.filter(c =>
    c.event_date && isSameMonth(new Date(c.event_date + 'T12:00:00'), current)
  )

  function goBack() {
    if (view === 'mes') setCurrent(d => subMonths(d, 1))
    else setCurrent(d => subWeeks(d, 1))
  }
  function goForward() {
    if (view === 'mes') setCurrent(d => addMonths(d, 1))
    else setCurrent(d => addWeeks(d, 1))
  }
  function goToday() {
    setCurrent(new Date())
  }

  const headerLabel = view === 'mes'
    ? format(current, 'MMMM yyyy', { locale: es })
    : `${format(weekStart, "d MMM", { locale: es })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111] capitalize">{headerLabel}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-[#D9D9D9] rounded-sm overflow-hidden text-sm">
            <button
              onClick={() => setView('mes')}
              className={`px-3 py-1.5 transition-colors ${view === 'mes' ? 'bg-[#111] text-white' : 'text-[#666] hover:text-[#111] hover:bg-[#F5F5F5]'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setView('semana')}
              className={`px-3 py-1.5 border-l border-[#D9D9D9] transition-colors ${view === 'semana' ? 'bg-[#111] text-white' : 'text-[#666] hover:text-[#111] hover:bg-[#F5F5F5]'}`}
            >
              Semana
            </button>
          </div>
          <button
            onClick={goToday}
            className="text-sm border border-[#D9D9D9] px-3 py-1.5 rounded-sm text-[#111] hover:border-[#111] transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={goBack}
            className="p-1.5 border border-[#D9D9D9] rounded-sm text-[#666] hover:border-[#111] hover:text-[#111] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={goForward}
            className="p-1.5 border border-[#D9D9D9] rounded-sm text-[#666] hover:border-[#111] hover:text-[#111] transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-[#AAA] py-20">Cargando...</div>
      ) : (
        <>
          {view === 'mes' && monthEvents.length > 0 && (
            <div className="mb-4 text-xs text-[#888]">
              {monthEvents.length} evento{monthEvents.length > 1 ? 's' : ''} este mes
            </div>
          )}

          {view === 'mes' ? (
            <div className="bg-white border border-[#E8E8E8] rounded-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#E8E8E8]">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-[#888] uppercase tracking-wider py-2.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map(day => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayEvents = eventsByDate[key] || []
                  return (
                    <DayCell
                      key={key}
                      date={day}
                      events={dayEvents}
                      currentMonth={current}
                    />
                  )
                })}
              </div>
            </div>
          ) : (
            <WeekView weekStart={weekStart} eventsByDate={eventsByDate} />
          )}

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-4 mt-4">
            {Object.entries(STAGE_STYLE).filter(([k]) => k !== 'default').map(([stage, s]) => (
              <div key={stage} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span className="text-xs text-[#888]">{s.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-red-400" />
              <span className="text-xs text-[#888]">Conflicto</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
