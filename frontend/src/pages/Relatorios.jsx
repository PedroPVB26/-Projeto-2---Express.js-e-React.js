import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../services/api'
import { Erro, Carregando, ListaVazia } from '../components/Feedback'
import { mesAtual, reais } from '../utils'

const cores = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#ca8a04', '#475569']

export default function Relatorios() {
  const periodoInicial = mesAtual()
  const [filtros, setFiltros] = useState(periodoInicial)
  const [categorias, setCategorias] = useState(null)
  const [fontes, setFontes] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = async (periodo = filtros) => {
    setCarregando(true)
    setErro('')
    try {
      const [porCategoria, porFonte] = await Promise.all([
        api.get('/relatorios/categorias', { params: periodo }),
        api.get('/relatorios/fontes-destinos', { params: periodo }),
      ])
      setCategorias(porCategoria.data)
      setFontes(porFonte.data)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível carregar os relatórios.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar(periodoInicial) }, [])

  const dadosPizza = categorias?.categorias?.map((item) => ({
    name: item.nome,
    value: Number(item.total),
  })) || []

  const dadosFontes = [
    ...(fontes?.entradasPorFonte || []).map((item) => ({ nome: item.nome, entradas: Number(item.total), saidas: 0 })),
    ...(fontes?.saidasPorDestino || []).map((item) => {
      const existente = (fontes?.entradasPorFonte || []).find((entrada) => entrada.id === item.id)
      return existente ? null : { nome: item.nome, entradas: 0, saidas: Number(item.total) }
    }),
  ].filter(Boolean)

  return (
    <>
      <div className="page-heading"><h1>Relatórios</h1></div>
      <section className="panel filter-grid filter-grid-inline">
        <label>Início<input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></label>
        <label>Fim<input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></label>
        <button className="button button-primary" type="button" onClick={() => carregar()}>Gerar relatórios</button>
      </section>
      {erro && <Erro mensagem={erro} />}
      {carregando ? <Carregando /> : (
        <div className="report-grid">
          <section className="panel report-section">
            <h2>Saídas por categoria</h2>
            {!categorias?.categorias?.length ? <ListaVazia texto="Sem saídas no período." /> : (
              <>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dadosPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                        {dadosPizza.map((_, index) => <Cell key={index} fill={cores[index % cores.length]} />)}
                      </Pie>
                      <Tooltip formatter={(valor) => reais(valor)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Categoria</th><th>Total</th><th>Percentual</th><th>Período anterior</th></tr></thead>
                    <tbody>{categorias.categorias.map((item) => (
                      <tr key={item.id}><td>{item.nome}</td><td>{reais(item.total)}</td><td>{item.percentual?.toFixed(2)}%</td><td>{reais(item.periodoAnterior)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
            <h3>Entradas por categoria</h3>
            {(!categorias?.entradasPorCategoria || categorias.entradasPorCategoria.length === 0) ? <ListaVazia texto="Sem entradas no período." /> : (
              <div className="table-wrap"><table><thead><tr><th>Categoria</th><th>Total</th></tr></thead><tbody>
                {categorias.entradasPorCategoria.map((item) => <tr key={item.id}><td>{item.nome}</td><td>{reais(item.total)}</td></tr>)}
              </tbody></table></div>
            )}
          </section>

          <section className="panel report-section">
            <h2>Fontes e destinos</h2>
            <div className="chart-box">
              {dadosFontes.length === 0 ? <ListaVazia /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dadosFontes}>
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(valor) => reais(valor)} />
                    <Tooltip formatter={(valor) => reais(valor)} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#16a34a" />
                    <Bar dataKey="saidas" name="Saídas" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <h3>Entradas por fonte</h3>
            {(!fontes?.entradasPorFonte || fontes.entradasPorFonte.length === 0) ? <ListaVazia /> : (
              <div className="table-wrap"><table><thead><tr><th>Fonte</th><th>Total</th></tr></thead><tbody>
                {fontes.entradasPorFonte.map((item) => <tr key={item.id}><td>{item.nome}</td><td>{reais(item.total)}</td></tr>)}
              </tbody></table></div>
            )}
            <h3>Saídas por destino</h3>
            {(!fontes?.saidasPorDestino || fontes.saidasPorDestino.length === 0) ? <ListaVazia /> : (
              <div className="table-wrap"><table><thead><tr><th>Destino</th><th>Total</th></tr></thead><tbody>
                {fontes.saidasPorDestino.map((item) => <tr key={item.id}><td>{item.nome}</td><td>{reais(item.total)}</td></tr>)}
              </tbody></table></div>
            )}
            <h3>Saldo das contas</h3>
            {(!fontes?.saldoPorConta || fontes.saldoPorConta.length === 0) ? <ListaVazia /> : (
              <div className="table-wrap"><table><thead><tr><th>Conta</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>
                {fontes.saldoPorConta.map((item) => <tr key={item.id}><td>{item.nome}</td><td>{reais(item.totalEntradas)}</td><td>{reais(item.totalSaidas)}</td><td>{reais(item.saldo)}</td></tr>)}
              </tbody></table></div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
