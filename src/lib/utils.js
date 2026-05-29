// Formato moneda — siempre $ sin "US"
export function formatUSD(n) {
  if (n == null || n === '') return '—'
  return '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(n)
}

// Mapeo email → nombre visible y asignado (santi/matias)
const EMAIL_MAP = {
  'santicaccia@gmail.com':  { name: 'Santiago', assignee: 'santi' },
  'santiago@cfstudio.uy':   { name: 'Santiago', assignee: 'santi' },
  'matias@cfstudio.uy':     { name: 'Matías',   assignee: 'matias' },
}

export function getDisplayName(email) {
  return EMAIL_MAP[email]?.name ?? email?.split('@')[0] ?? 'Usuario'
}

export function getAssignee(email) {
  return EMAIL_MAP[email]?.assignee ?? null
}
