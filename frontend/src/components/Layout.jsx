import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = [
  ['/', 'Resumo'],
  ['/lancamentos', 'Lançamentos'],
  ['/categorias', 'Categorias'],
  ['/fontes-destinos', 'Fontes e destinos'],
  ['/relatorios', 'Relatórios'],
  ['/faturas', 'Faturas'],
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const sair = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Finanças<span>+</span></div>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <strong>{usuario?.nome}</strong>
          <button className="button button-secondary" type="button" onClick={sair}>Sair</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
