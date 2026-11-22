export function Erro({ mensagem }) {
  if (!mensagem) return null
  return <div className="alert alert-error" role="alert">{mensagem}</div>
}

export function ListaVazia({ texto = 'Nenhum registro encontrado.' }) {
  return <div className="empty-state">{texto}</div>
}

export function Carregando({ texto = 'Carregando...' }) {
  return <div className="status status-loading">{texto}</div>
}
