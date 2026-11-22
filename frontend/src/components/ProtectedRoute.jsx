import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { token, carregando } = useAuth()
  if (carregando) return <div className="status status-loading">Carregando sessão...</div>
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
