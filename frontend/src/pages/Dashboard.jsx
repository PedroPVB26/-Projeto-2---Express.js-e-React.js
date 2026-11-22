import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { mesAtual, reais, dataBR } from '../utils'
import { Carregando, Erro, ListaVazia } from '../components/Feedback'

export default function Dashboard() {
  const periodo = mesAtual()
  const [dados, setDados] = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/lancamentos', { params: periodo }),
      api.get('/lancamentos', { params: { ...periodo, pagina: 1 } }),
    ]).then(([, lista]) => {
      setDados(lista.data)
      setLancamentos(lista.data.lancamentos)
    }).catch((error) => setErro(error.response?.data?.erro || 'Não foi possível carregar o resumo.'))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <Carregando texto="Montando seu resumo..." />
  if (erro) return <Erro mensagem={erro} />

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Resumo financeiro</p>
          <h1>Visão do mês</h1>
        </div>
      </div>
      <section className="summary-grid">
        <article className="summary-card entrada">
          <span>Entradas</span>
          <strong>{reais(dados?.resumo?.totalEntradas)}</strong>
        </article>
        <article className="summary-card saida">
          <span>Saídas</span>
          <strong>{reais(dados?.resumo?.totalSaidas)}</strong>
        </article>
        <article className="summary-card saldo">
          <span>Saldo</span>
          <strong>{reais(dados?.resumo?.saldo)}</strong>
        </article>
      </section>
      <section className="panel">
        <h2>Últimos lançamentos</h2>
        {lancamentos.length === 0 ? <ListaVazia /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Descrição</th><th>Tipo</th><th>Data</th><th>Valor</th></tr></thead>
              <tbody>
                {lancamentos.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td><span className={`badge ${item.tipo}`}>{item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td>{dataBR(item.data)}</td>
                    <td className={item.tipo}>{reais(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
