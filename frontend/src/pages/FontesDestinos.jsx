import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Erro, ListaVazia, Carregando } from '../components/Feedback'
import { erroCampos, reais } from '../utils'

const inicial = { nome: '', tipo: 'conta', diaFechamento: '', diaVencimento: '', limite: '' }

export default function FontesDestinos() {
  const [itens, setItens] = useState([])
  const [dados, setDados] = useState(inicial)
  const [editando, setEditando] = useState(null)
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = async () => {
    setCarregando(true)
    try {
      const { data } = await api.get('/fontes-destinos')
      setItens(data.fontesDestinos)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível listar fontes e destinos.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const salvar = async (event) => {
    event.preventDefault()
    setErro('')
    setSucesso('')
    setCampos({})
    const payload = {
      ...dados,
      diaFechamento: dados.tipo === 'cartao_credito' ? Number(dados.diaFechamento) : null,
      diaVencimento: dados.tipo === 'cartao_credito' ? Number(dados.diaVencimento) : null,
      limite: dados.tipo === 'cartao_credito' ? dados.limite : null,
    }
    try {
      if (editando) await api.put(`/fontes-destinos/${editando}`, payload)
      else await api.post('/fontes-destinos', payload)
      setDados(inicial)
      setEditando(null)
      setSucesso(editando ? 'Registro atualizado.' : 'Registro criado.')
      await carregar()
    } catch (error) {
      setCampos(erroCampos(error))
      setErro(error.response?.data?.erro || 'Não foi possível salvar.')
    }
  }

  const excluir = async (item) => {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return
    try {
      await api.delete(`/fontes-destinos/${item.id}`)
      await carregar()
      setSucesso('Registro excluído.')
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível excluir.')
    }
  }

  return (
    <>
      <div className="page-heading"><h1>Fontes e destinos</h1></div>
      {erro && <Erro mensagem={erro} />}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      <div className="crud-grid">
        <form className="panel form" onSubmit={salvar} noValidate>
          <h2>{editando ? 'Editar registro' : 'Novo registro'}</h2>
          <label>Nome
            <input value={dados.nome} maxLength={60} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
            {campos.nome && <small className="field-error">{campos.nome}</small>}
          </label>
          <label>Tipo
            <select value={dados.tipo} onChange={(e) => setDados({ ...dados, tipo: e.target.value })}>
              <option value="conta">Conta</option>
              <option value="renda">Renda</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </label>
          {dados.tipo === 'cartao_credito' && (
            <>
              <label>Dia de fechamento
                <input type="number" min="1" max="31" value={dados.diaFechamento} onChange={(e) => setDados({ ...dados, diaFechamento: e.target.value })} />
              </label>
              <label>Dia de vencimento
                <input type="number" min="1" max="31" value={dados.diaVencimento} onChange={(e) => setDados({ ...dados, diaVencimento: e.target.value })} />
              </label>
              <label>Limite
                <input type="number" min="0.01" step="0.01" value={dados.limite} onChange={(e) => setDados({ ...dados, limite: e.target.value })} />
              </label>
            </>
          )}
          <div className="button-row">
            <button className="button button-primary" type="submit">{editando ? 'Salvar' : 'Adicionar'}</button>
            {editando && <button className="button button-secondary" type="button" onClick={() => { setEditando(null); setDados(inicial) }}>Cancelar</button>}
          </div>
        </form>
        <section className="panel">
          {carregando ? <Carregando /> : itens.length === 0 ? <ListaVazia texto="Nenhuma fonte ou destino cadastrado." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Tipo</th><th>Cartão</th><th>Ações</th></tr></thead>
                <tbody>{itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{item.tipo === 'cartao_credito' ? 'Cartão' : item.tipo === 'renda' ? 'Renda' : 'Conta'}</td>
                    <td>{item.tipo === 'cartao_credito' ? `${reais(item.limite)} · vence dia ${item.diaVencimento}` : '-'}</td>
                    <td>
                      <button className="link-button" type="button" onClick={() => { setEditando(item.id); setDados({ nome: item.nome, tipo: item.tipo, diaFechamento: item.diaFechamento || '', diaVencimento: item.diaVencimento || '', limite: item.limite || '' }) }}>Editar</button>
                      <button className="link-button danger" type="button" onClick={() => excluir(item)}>Excluir</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
