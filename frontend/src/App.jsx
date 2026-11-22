import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Dashboard from './pages/Dashboard'
import Lancamentos from './pages/Lancamentos'
import Categorias from './pages/Categorias'
import FontesDestinos from './pages/FontesDestinos'
import Relatorios from './pages/Relatorios'
import Faturas from './pages/Faturas'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="lancamentos" element={<Lancamentos />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="fontes-destinos" element={<FontesDestinos />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="faturas" element={<Faturas />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
