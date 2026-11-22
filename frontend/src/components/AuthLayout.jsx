import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" to="/login">Finanças<span>+</span></Link>
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </section>
    </div>
  )
}
