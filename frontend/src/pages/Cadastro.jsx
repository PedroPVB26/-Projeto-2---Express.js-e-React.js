import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { Erro } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { cpfValido, erroCampos, formatarCPF } from '../utils'

export default function Cadastro() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const inicial = { nome: '', email: '', cpf: '', senha: '', confirmarSenha: '' }
  const [dados, setDados] = useState(inicial)
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const validar = () => {
    const erros = {}
    if (!dados.nome.trim()) erros.nome = 'O nome é obrigatório.'
    if (!dados.email.trim()) erros.email = 'O e-mail é obrigatório.'
    if (!cpfValido(dados.cpf)) erros.cpf = 'Informe um CPF válido.'
    if (dados.senha.length < 8 || !/[A-Za-zÀ-ÿ]/.test(dados.senha) || !/\d/.test(dados.senha)) {
      erros.senha = 'Use pelo menos 8 caracteres com letras e números.'
    }
    if (dados.confirmarSenha !== dados.senha) erros.confirmarSenha = 'As senhas não correspondem.'
    setCampos(erros)
    return Object.keys(erros).length === 0
  }

  const enviar = async (event) => {
    event.preventDefault()
    setErro('')
    if (!validar()) return
    setEnviando(true)
    try {
      await cadastrar(dados)
      navigate('/login', { replace: true, state: { cadastroSucesso: true } })
    } catch (error) {
      setCampos({ ...campos, ...erroCampos(error) })
      setErro(error.response?.data?.erro || 'Não foi possível concluir o cadastro.')
    } finally {
      setEnviando(false)
    }
  }

  const alterar = (campo, valor) => setDados({ ...dados, [campo]: valor })

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a organizar suas finanças">
      <Erro mensagem={erro} />
      <form className="form" onSubmit={enviar} noValidate>
        <label>Nome
          <input value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} />
          {campos.nome && <small className="field-error">{campos.nome}</small>}
        </label>
        <label>E-mail
          <input type="email" value={dados.email} onChange={(e) => alterar('email', e.target.value)} />
          {campos.email && <small className="field-error">{campos.email}</small>}
        </label>
        <label>CPF
          <input inputMode="numeric" value={dados.cpf} onChange={(e) => alterar('cpf', formatarCPF(e.target.value))} />
          {campos.cpf && <small className="field-error">{campos.cpf}</small>}
        </label>
        <label>Senha
          <input type="password" value={dados.senha} onChange={(e) => alterar('senha', e.target.value)} />
          {campos.senha && <small className="field-error">{campos.senha}</small>}
        </label>
        <label>Confirmar senha
          <input type="password" value={dados.confirmarSenha} onChange={(e) => alterar('confirmarSenha', e.target.value)} />
          {campos.confirmarSenha && <small className="field-error">{campos.confirmarSenha}</small>}
        </label>
        <button className="button button-primary" type="submit" disabled={enviando}>
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>
      <p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p>
    </AuthLayout>
  )
}
