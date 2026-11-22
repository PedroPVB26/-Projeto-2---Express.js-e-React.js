import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Erro, ListaVazia, Carregando } from '../components/Feedback'
import { dataBR, erroCampos, mesAtual, reais } from '../utils'

const inicial = {
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: new Date().toISOString().slice(0, 10),
  categoriaId: '',
  fonteDestinoId: '',
  totalParcelas: 1,
}

export default function Lancamentos() {
  const periodoInicial = mesAtual()
  const [itens, setItens] = useState([])
  const [dados, setDados] = useState(inicial)
  const [filtros, setFiltros] = useState({
    inicio: periodoInicial.inicio,
    fim: periodoInicial.fim,
    tipo: '',
    categoriaId: '',
    fonteDestinoId: '',
  })
  const [categorias, setCategorias] = useState([])
  const [fontes, setFontes] = useState([])
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 0 })
  const [resumo, setResumo] = useState({})
  const [editando, setEditando] = useState(null)
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregarOpcoes = async () => {
    const [categoriasResponse, fontesResponse] = await Promise.all([
      api.get('/categorias'),
      api.get('/fontes-destinos'),
    ])
    setCategorias(categoriasResponse.data.categorias)
    setFontes(fontesResponse.data.fontesDestinos)
  }

  const carregar = async (pagina = 1) => {
    setCarregando(true)
    setErro('')
    try {
      const params = Object.fromEntries(Object.entries({ ...filtros, pagina }).filter(([, valor]) => valor !== '' && valor !== null))
      const { data } = await api.get('/lancamentos', { params })
      setItens(data.lancamentos)
      setPaginacao(data.paginacao)
      setResumo(data.resumo)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível listar lançamentos.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    Promise.all([carregarOpcoes(), carregar()])
      .catch((error) => setErro(error.response?.data?.erro || 'Não foi possível carregar os dados.'))
  }, [])

  const categoriasFiltradas = categorias.filter((item) => item.tipo === dados.tipo)
  const fontesDisponiveis = fontes

  const salvar = async (event) => {
    event.preventDefault()
    setErro('')
    setSucesso('')
    setCampos({})
    const payload = {
      ...dados,
      categoriaId: Number(dados.categoriaId),
      fonteDestinoId: Number(dados.fonteDestinoId),
      totalParcelas: editando ? undefined : Number(dados.totalParcelas),
    }
    try {
      if (editando) {
        await api.put(`/lancamentos/${editando}`, payload)
      } else {
        await api.post('/lancamentos', payload)
      }
      setDados(inicial)
      setEditando(null)
      setSucesso(editando ? 'Lançamento atualizado.' : 'Lançamento registrado.')
      await carregar(paginacao.pagina)
    } catch (error) {
      setCampos(erroCampos(error))
      setErro(error.response?.data?.erro || 'Não foi possível salvar.')
    }
  }

  const editar = (item) => {
    setEditando(item.id)
    setDados({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
      data: item.data.slice(0, 10),
      categoriaId: String(item.categoriaId),
      fonteDestinoId: String(item.fonteDestinoId),
      totalParcelas: item.totalParcelas || 1,
    })
  }

  const excluir = async (item) => {
    if (!window.confirm(`Excluir o lançamento "${item.descricao}"?`)) return
    let todasParcelas = false
    if (item.grupoParcelamento && item.totalParcelas > 1) {
      const todas = window.confirm('Excluir todas as parcelas desta compra?\n\nClique em OK para todas ou em Cancelar para apenas esta parcela.')
      todasParcelas = todas
    }
    try {
      await api.delete(`/lancamentos/${item.id}?todasParcelas=${todasParcelas}`)
      setSucesso(todasParcelas ? 'Todas as parcelas foram excluídas.' : 'Lançamento excluído.')
      await carregar(paginacao.pagina)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível excluir.')
    }
  }

  return (
    <>
      <div className="page-heading"><h1>Lançamentos</h1></div>
      {erro && <Erro mensagem={erro} />}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      <form className="panel form form-grid" onSubmit={salvar} noValidate>
        <h2>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
        <label>Tipo
          <select value={dados.tipo} onChange={(e) => setDados({ ...dados, tipo: e.target.value, categoriaId: '' })}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>
        <label>Descrição
          <input value={dados.descricao} maxLength={120} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} />
          {campos.descricao && <small className="field-error">{campos.descricao}</small>}
        </label>
        <label>Valor
          <input type="number" min="0.01" step="0.01" value={dados.valor} onChange={(e) => setDados({ ...dados, valor: e.target.value })} />
          {campos.valor && <small className="field-error">{campos.valor}</small>}
        </label>
        <label>Data
          <input type="date" value={dados.data} onChange={(e) => setDados({ ...dados, data: e.target.value })} />
          {campos.data && <small className="field-error">{campos.data}</small>}
        </label>
        <label>Categoria
          <select value={dados.categoriaId} onChange={(e) => setDados({ ...dados, categoriaId: e.target.value })}>
            <option value="">Selecione</option>
            {categoriasFiltradas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          {campos.categoriaId && <small className="field-error">{campos.categoriaId}</small>}
        </label>
        <label>Fonte/destino
          <select value={dados.fonteDestinoId} onChange={(e) => setDados({ ...dados, fonteDestinoId: e.target.value })}>
            <option value="">Selecione</option>
            {fontesDisponiveis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          {campos.fonteDestinoId && <small className="field-error">{campos.fonteDestinoId}</small>}
        </label>
        {!editando && (
          <label>Parcelas
            <input type="number" min="1" max="48" value={dados.totalParcelas} onChange={(e) => setDados({ ...dados, totalParcelas: e.target.value })} />
            {campos.totalParcelas && <small className="field-error">{campos.totalParcelas}</small>}
          </label>
        )}
        <div className="button-row form-actions">
          <button className="button button-primary" type="submit">{editando ? 'Salvar alterações' : 'Registrar'}</button>
          {editando && <button className="button button-secondary" type="button" onClick={() => { setEditando(null); setDados(inicial) }}>Cancelar</button>}
        </div>
      </form>

      <section className="panel filters">
        <div className="summary-grid summary-grid-small">
          <article className="summary-card entrada"><span>Entradas</span><strong>{reais(resumo.totalEntradas)}</strong></article>
          <article className="summary-card saida"><span>Saídas</span><strong>{reais(resumo.totalSaidas)}</strong></article>
          <article className="summary-card saldo"><span>Saldo</span><strong>{reais(resumo.saldo)}</strong></article>
        </div>
        <div className="filter-grid">
          <label>Início<input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></label>
          <label>Fim<input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></label>
          <label>Tipo
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Todos</option><option value="entrada">Entrada</option><option value="saida">Saída</option>
            </select>
          </label>
          <label>Categoria
            <select value={filtros.categoriaId} onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}>
              <option value="">Todas</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <label>Fonte/destino
            <select value={filtros.fonteDestinoId} onChange={(e) => setFiltros({ ...filtros, fonteDestinoId: e.target.value })}>
              <option value="">Todos</option>{fontes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <button className="button button-primary" type="button" onClick={() => carregar(1)}>Filtrar</button>
        </div>
      </section>

      <section className="panel">
        {carregando ? <Carregando /> : itens.length === 0 ? <ListaVazia texto="Nenhum lançamento neste período." /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Fonte/destino</th><th>Data</th><th>Valor</th><th>Ações</th></tr></thead>
                <tbody>{itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.descricao}{item.totalParcelas > 1 && <small className="parcel-label"> {item.parcelaAtual}/{item.totalParcelas}</small>}</td>
                    <td><span className={`badge ${item.tipo}`}>{item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td>{item.categoria?.nome}</td>
                    <td>{item.fonteDestino?.nome}</td>
                    <td>{dataBR(item.data)}</td>
                    <td className={item.tipo}>{reais(item.valor)}</td>
                    <td>
                      <button className="link-button" type="button" onClick={() => editar(item)}>Editar</button>
                      <button className="link-button danger" type="button" onClick={() => excluir(item)}>Excluir</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {paginacao.totalPaginas > 1 && (
              <div className="pagination">
                <button className="button button-secondary" type="button" disabled={paginacao.pagina <= 1} onClick={() => carregar(paginacao.pagina - 1)}>Anterior</button>
                <span>Página {paginacao.pagina} de {paginacao.totalPaginas}</span>
                <button className="button button-secondary" type="button" disabled={paginacao.pagina >= paginacao.totalPaginas} onClick={() => carregar(paginacao.pagina + 1)}>Próxima</button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
