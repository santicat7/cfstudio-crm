import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  CreditCard,
  CheckSquare,
  Package,
  MessageSquare,
  BarChart2,
  Receipt,
  Clapperboard,
  LogOut,
  X,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getDisplayName } from '../lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Kanban },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/tareas', label: 'Tareas', icon: CheckSquare },
  { to: '/entregas', label: 'Entregas', icon: Package },
  { to: '/mensajes', label: 'Mensajes', icon: MessageSquare },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart2 },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/evento', label: 'Hoja de evento', icon: Clapperboard },
]

export default function Sidebar({ open, onClose }) {
  const { signOut, session } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const userName = getDisplayName(session?.user?.email)

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-[#1A1814] z-30 flex flex-col
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div>
            <img src="/logo-dark.png" alt="C&F Studio" className="h-6 w-auto" />
            <div className="text-xs mt-1.5" style={{ color: '#C9A96E', opacity: 0.8 }}>{userName}</div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-white/40 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-white font-medium bg-[#FDFBF7]/10'
                    : 'text-white/50 hover:text-white hover:bg-[#FDFBF7]/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={1.75} style={isActive ? { color: '#C9A96E' } : {}} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 space-y-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-3 text-sm text-white/40 hover:text-white transition-colors w-full"
          >
            {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 text-sm text-white/40 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
