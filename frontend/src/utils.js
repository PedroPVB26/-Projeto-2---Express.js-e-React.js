export const reais = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor || 0))

export const dataBR = (valor) => {
  if (!valor) return '-'
  const texto = typeof valor === 'string' ? valor.slice(0, 10) : valor
  const data = typeof texto === 'string'
    ? new Date(`${texto}T12:00:00`)
    : texto
  return new Intl.DateTimeFormat('pt-BR').format(data)
}

export function formatarCPF(valor) {
  return valor.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (tamanho) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

export function mesAtual() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const iso = (data) => {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  return { inicio: iso(inicio), fim: iso(fim) }
}

export function erroCampos(error) {
  return error.response?.data?.campos || {}
}

