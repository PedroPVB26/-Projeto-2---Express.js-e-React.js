import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Erro, Carregando, ListaVazia } from '../components/Feedback'
import { dataBR, reais } from '../utils'

export default function Faturas() {
  const [dados, setDados] = useState(null)
  const [meses, setMeses] = useState(3)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = async (quantidade = meses) => {
    setCarregando(true)
    setErro('')
    try {
      const { data } = await api.get('/relatorios/faturas', { params: { meses: quantidade } })
      setDados(data)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível carregar as faturas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar(3) }, [])

  return (
    <>
      <div className="page-heading">
        <h1>Faturas de cartão</h1>
        <div className="button-row">
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            {[3, 6, 12].map((item) => <option key={item} value={item}>{item} meses</option>)}
          </select>
          <button className="button button-primary" type="button" onClick={() => carregar(meses)}>Atualizar</button>
        </div>
      </div>
      {erro && <Erro mensagem={erro} />}
      {carregando ? <Carregando /> : !dados?.cartoes?.length ? <ListaVazia texto="Nenhum cartão de crédito cadastrado." /> : (
        <div className="cards-grid">
          {dados.cartoes.map((cartao) => (
            <section className="panel invoice-card" key={cartao.id}>
              <div className="invoice-header">
                <div>
                  <p className="eyebrow">Cartão</p>
                  <h2>{cartao.nome}</h2>
                </div>
                <span className="limit-pill">Limite {reais(cartao.limite)}</span>
              </div>
              <div className="limit-grid">
                <div><span>Utilizado</span><strong>{reais(cartao.limiteUtilizado)}</strong></div>
                <div><span>Disponível</span><strong>{reais(cartao.limiteDisponivel)}</strong></div>
              </div>
              <h3>Fatura atual</h3>
              {cartao.faturaAtual ? (
                <article className="invoice">
                  <div className="invoice-meta">
                    <span>Fechamento: {dataBR(cartao.faturaAtual.fechamento)}</span>
                    <span>Vencimento: {dataBR(cartao.faturaAtual.vencimento)}</span>
                    <strong>{reais(cartao.faturaAtual.valorTotal)}</strong>
                  </div>
                  {cartao.faturaAtual.lancamentos?.length ? (
                    <ul>{cartao.faturaAtual.lancamentos.map((item) => (
                      <li key={item.id}>
                        <span>{item.descricao} — {item.parcelaAtual}/{item.totalParcelas}</span>
                        <strong>{reais(item.valor)}</strong>
                      </li>
                    ))}</ul>
                  ) : <ListaVazia texto="Nenhum lançamento nesta fatura." />}
                </article>
              ) : <ListaVazia texto="Nenhuma fatura atual." />}
              <h3>Próximas faturas</h3>
              {cartao.proximasFaturas?.length ? cartao.proximasFaturas.map((fatura) => (
                <article className="invoice" key={fatura.referencia}>
                  <div className="invoice-meta">
                    <span>Fechamento: {dataBR(fatura.fechamento)}</span>
                    <span>Vencimento: {dataBR(fatura.vencimento)}</span>
                    <strong>{reais(fatura.valorTotal)}</strong>
                  </div>
                  {fatura.lancamentos?.length ? (
                    <ul>{fatura.lancamentos.map((item) => (
                      <li key={item.id}><span>{item.descricao} — {item.parcelaAtual}/{item.totalParcelas}</span><strong>{reais(item.valor)}</strong></li>
                    ))}</ul>
                  ) : <ListaVazia texto="Nenhum lançamento previsto." />}
                </article>
              )) : <ListaVazia texto="Nenhuma fatura futura prevista." />}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
