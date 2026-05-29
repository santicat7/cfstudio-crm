import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }
    if (!remember) {
      window.addEventListener('beforeunload', () => signOut(), { once: true })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="text-2xl font-semibold tracking-tight text-[#1A1814] mb-1">
            C&amp;F Studio
          </div>
          <div className="text-sm text-[#666]">CRM interno — Paysandú, Uruguay</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@cfstudio.uy"
              required
              className="w-full px-3 py-2.5 border border-[#D9D9D9] bg-[#FDFBF7] text-[#1A1814] text-sm rounded-xl outline-none focus:border-[#1A1814] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1814] mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 border border-[#D9D9D9] bg-[#FDFBF7] text-[#1A1814] text-sm rounded-xl outline-none focus:border-[#1A1814] transition-colors"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded-xl accent-[#111] cursor-pointer"
            />
            <span className="text-sm text-[#666]">Recordar sesión</span>
          </label>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A1814] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#1A1814] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
