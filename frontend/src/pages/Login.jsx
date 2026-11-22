import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { Erro } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { erroCampos } from '../utils'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [dados, setDados] = useState({ email: '', senha: '' })
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (event) => {
    event.preventDefault()
    setErro('')
    setCampos({})
    setEnviando(true)
    try {
      await login(dados.email, dados.senha)
      navigate('/', { replace: true })
    } catch (error) {
      setCampos(erroCampos(error))
      setErro(error.response?.data?.erro || 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesse seu controle financeiro">
      <Erro mensagem={erro} />
      <form className="form" onSubmit={enviar} noValidate>
        <label>E-mail
          <input type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />
          {campos.email && <small className="field-error">{campos.email}</small>}
        </label>
        <label>Senha
          <input type="password" value={dados.senha} onChange={(e) => setDados({ ...dados, senha: e.target.value })} />
          {campos.senha && <small className="field-error">{campos.senha}</small>}
          {campos.credenciais && <small className="field-error">{campos.credenciais}</small>}
        </label>
        <button className="button button-primary" type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="auth-link">Novo por aqui? <Link to="/cadastro">Criar conta</Link></p>
    </AuthLayout>
  )
}
