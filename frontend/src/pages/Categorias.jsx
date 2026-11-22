import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Erro, ListaVazia, Carregando } from '../components/Feedback'
import { erroCampos } from '../utils'

const inicial = { nome: '', tipo: 'saida' }

export default function Categorias() {
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
      const { data } = await api.get('/categorias')
      setItens(data.categorias)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível listar categorias.')
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
    try {
      if (editando) await api.put(`/categorias/${editando}`, dados)
      else await api.post('/categorias', dados)
      setDados(inicial)
      setEditando(null)
      setSucesso(editando ? 'Categoria atualizada.' : 'Categoria criada.')
      await carregar()
    } catch (error) {
      setCampos(erroCampos(error))
      setErro(error.response?.data?.erro || 'Não foi possível salvar.')
    }
  }

  const excluir = async (item) => {
    if (!window.confirm(`Excluir a categoria "${item.nome}"?`)) return
    setErro('')
    try {
      await api.delete(`/categorias/${item.id}`)
      await carregar()
      setSucesso('Categoria excluída.')
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível excluir.')
    }
  }

  return (
    <>
      <div className="page-heading"><h1>Categorias</h1></div>
      {erro && <Erro mensagem={erro} />}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      <div className="crud-grid">
        <form className="panel form" onSubmit={salvar} noValidate>
          <h2>{editando ? 'Editar categoria' : 'Nova categoria'}</h2>
          <label>Nome
            <input value={dados.nome} maxLength={60} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
            {campos.nome && <small className="field-error">{campos.nome}</small>}
          </label>
          <label>Tipo
            <select value={dados.tipo} onChange={(e) => setDados({ ...dados, tipo: e.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </label>
          <div className="button-row">
            <button className="button button-primary" type="submit">{editando ? 'Salvar' : 'Adicionar'}</button>
            {editando && <button className="button button-secondary" type="button" onClick={() => { setEditando(null); setDados(inicial) }}>Cancelar</button>}
          </div>
        </form>
        <section className="panel">
          {carregando ? <Carregando /> : itens.length === 0 ? <ListaVazia texto="Nenhuma categoria cadastrada." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead>
                <tbody>{itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td><span className={`badge ${item.tipo}`}>{item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td>
                      <button className="link-button" type="button" onClick={() => { setEditando(item.id); setDados({ nome: item.nome, tipo: item.tipo }) }}>Editar</button>
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
