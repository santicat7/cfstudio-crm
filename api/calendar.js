import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

function pad(n) {
  return String(n).padStart(2, '0')
}

function toICSDate(dateStr, timeStr) {
  // dateStr: 'yyyy-MM-dd', timeStr: 'HH:mm' (optional)
  const [year, month, day] = dateStr.split('-')
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hour, minute] = timeStr.split(':')
    return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  }
  // All-day event
  return `${year}${pad(month)}${pad(day)}`
}

function escapeICS(str) {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export default async function handler(req, res) {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, event_type, event_date, event_time, package, venue_name, venue_address, total_price, notes')
      .not('event_date', 'is', null)
      .order('event_date', { ascending: true })

    if (error) throw error

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//C&F Studio CRM//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:C&F Studio — Eventos',
      'X-WR-TIMEZONE:America/Montevideo',
    ]

    for (const c of clients || []) {
      const dtstart = toICSDate(c.event_date, c.event_time)
      const isAllDay = !c.event_time || !/^\d{1,2}:\d{2}$/.test(c.event_time)

      // End time: 4 hours after start, or next day if all-day
      let dtend
      if (isAllDay) {
        const d = new Date(c.event_date + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        dtend = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`
      } else {
        const [h, m] = c.event_time.split(':').map(Number)
        const endH = (h + 4) % 24
        const [year, month, day] = c.event_date.split('-')
        dtend = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(m)}00`
      }

      const summary = [c.event_type, c.name].filter(Boolean).join(' · ')
      const descParts = []
      if (c.package) descParts.push(`Paquete: ${c.package}`)
      if (c.event_time) descParts.push(`Horario: ${c.event_time}`)
      if (c.total_price) descParts.push(`Total: USD ${c.total_price}`)
      if (c.notes) descParts.push(`Notas: ${c.notes}`)
      const description = descParts.join('\\n')

      const location = [c.venue_name, c.venue_address].filter(Boolean).join(', ')

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:cfstudio-${c.id}@cfstudio.vercel.app`)
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)

      if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
        lines.push(`DTEND;VALUE=DATE:${dtend}`)
      } else {
        lines.push(`DTSTART;TZID=America/Montevideo:${dtstart}`)
        lines.push(`DTEND;TZID=America/Montevideo:${dtend}`)
      }

      lines.push(`SUMMARY:${escapeICS(summary)}`)
      if (description) lines.push(`DESCRIPTION:${description}`)
      if (location) lines.push(`LOCATION:${escapeICS(location)}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const ics = lines.join('\r\n')

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="cfstudio.ics"')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.status(200).send(ics)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
