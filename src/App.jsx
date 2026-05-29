import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Calendario from './pages/Calendario'
import Pagos from './pages/Pagos'
import PagosDetalle from './pages/PagosDetalle'
import Tareas from './pages/Tareas'
import Entregas from './pages/Entregas'
import Mensajes from './pages/Mensajes'
import Estadisticas from './pages/Estadisticas'
import Gastos from './pages/Gastos'
import HojaEvento from './pages/HojaEvento'
import ComingSoon from './pages/ComingSoon'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-sm text-[#888]">Cargando...</div>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />

          <Route element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalle />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/pagos/:clientId" element={<PagosDetalle />} />
            <Route path="/tareas" element={<Tareas />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/mensajes" element={<Mensajes />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/evento" element={<HojaEvento />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
