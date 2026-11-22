import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('financas_usuario')
    return salvo ? JSON.parse(salvo) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('financas_token'))
  const [carregando, setCarregando] = useState(Boolean(token))

  useEffect(() => {
    const sair = () => logout()
    window.addEventListener('auth:logout', sair)
    return () => window.removeEventListener('auth:logout', sair)
  }, [])

  useEffect(() => {
    if (!token) {
      setCarregando(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => {
        setUsuario(data.usuario)
        localStorage.setItem('financas_usuario', JSON.stringify(data.usuario))
      })
      .catch(() => logout())
      .finally(() => setCarregando(false))
  }, [token])

  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha })
    localStorage.setItem('financas_token', data.token)
    localStorage.setItem('financas_usuario', JSON.stringify(data.usuario))
    setToken(data.token)
    setUsuario(data.usuario)
    return data.usuario
  }

  const cadastrar = async (dados) => {
    const { data } = await api.post('/auth/cadastro', dados)
    return data
  }

  const logout = () => {
    localStorage.removeItem('financas_token')
    localStorage.removeItem('financas_usuario')
    setToken(null)
    setUsuario(null)
  }

  const value = useMemo(
    () => ({ usuario, token, carregando, login, logout, cadastrar }),
    [usuario, token, carregando],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
