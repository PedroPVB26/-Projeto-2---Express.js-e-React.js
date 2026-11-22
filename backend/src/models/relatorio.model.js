
import { prisma } from "../config/prisma.js";
import { AppError } from "../config/erro.js";

const TIME_ZONE = "America/Sao_Paulo";

const MESES_MINIMOS_FATURAS = 3;
const MESES_MAXIMOS_FATURAS = 12;


function validarUsuarioId(usuarioId) {
    const valor = Number(usuarioId);

    if (!Number.isSafeInteger(valor) || valor <= 0) {
        throw new AppError(400, "Dados inválidos.", {
            usuarioId: "Identificador de usuário inválido."
        });
    }

    return valor;
}


function decimalParaCentavos(valor) {
    if (valor === null || valor === undefined) {
        return 0n;
    }

    const texto = valor.toFixed(2);
    const [inteiros, decimais] = texto.split(".");

    return BigInt(inteiros) * 100n + BigInt(decimais);
}

function obterTextoQuery(valor, campo) {
    if (valor === undefined || valor === null) {
        return "";
    }

    if (typeof valor !== "string") {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Informe somente um valor para este parâmetro."
        });
    }

    return valor.trim();
}

function centavosParaDecimal(centavos) {
    const negativo = centavos < 0n;
    const absoluto = negativo ? -centavos : centavos;

    const inteiros = absoluto / 100n;

    const decimais = (absoluto % 100n)
        .toString()
        .padStart(2, "0");

    return `${negativo ? "-" : ""}${inteiros}.${decimais}`;
}

function somarValores(grupos) {
    return grupos.reduce(
        (total, grupo) =>
            total + decimalParaCentavos(grupo._sum.valor),
        0n
    );
}

function calcularPercentual(parte, total) {
    if (total === 0n) {
        return 0;
    }

    // Percentual com duas casas decimais.
    const resultado = (
        parte * 10000n + total / 2n
    ) / total;

    return Number(resultado) / 100;
}

function calcularVariacaoPercentual(atual, anterior) {
    if (anterior === 0n) {
        return atual === 0n ? 0 : null;
    }

    const diferenca = atual - anterior;
    const negativo = diferenca < 0n;

    const absoluto = negativo ? -diferenca : diferenca;

    const resultado = (
        absoluto * 10000n + anterior / 2n
    ) / anterior;

    return (negativo ? -1 : 1) * Number(resultado) / 100;
}

function obterTendencia(atual, anterior) {
    if (atual > anterior) {
        return "aumento";
    }

    if (atual < anterior) {
        return "reducao";
    }

    return "estavel";
}

// ======================================================
// DATAS E PERÍODOS
// Datas são manipuladas em UTC para evitar problemas de conversão de fuso horário.
// ======================================================

function formatarData(data) {
    return data.toISOString().slice(0, 10);
}

function criarData(ano, mes, dia) {
    return new Date(Date.UTC(ano, mes, dia));
}

function adicionarDias(data, quantidade) {
    const resultado = new Date(data);

    resultado.setUTCDate(
        resultado.getUTCDate() + quantidade
    );

    return resultado;
}

function ultimoDiaDoMes(ano, mes) {
    return criarData(ano, mes + 1, 0).getUTCDate();
}

// Obtém a data atual no fuso de Brasília.
function obterHoje() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valor = (tipo) =>
        Number(partes.find(parte => parte.type === tipo).value);

    return criarData(
        valor("year"),
        valor("month") - 1,
        valor("day")
    );
}

function validarData(data, campo) {
    if (typeof data !== "string") {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Informe uma data no formato YYYY-MM-DD."
        });
    }

    const texto = data.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Utilize o formato YYYY-MM-DD."
        });
    }

    const resultado = new Date(`${texto}T00:00:00.000Z`);

    if (
        Number.isNaN(resultado.getTime()) ||
        formatarData(resultado) !== texto
    ) {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Informe uma data válida."
        });
    }

    return resultado;
}

// Gera um período com início e fim.
function obterPeriodo(filtros = {}) {
    const inicioInformado = obterTextoQuery(
        filtros.inicio,
        "inicio"
    );

    const fimInformado = obterTextoQuery(
        filtros.fim,
        "fim"
    );

    if (
        (inicioInformado && !fimInformado) ||
        (!inicioInformado && fimInformado)
    ) {
        throw new AppError(400, "Dados inválidos.", {
            periodo: "Informe as datas inicial e final."
        });
    }

    let inicio;
    let fim;

    // Sem filtros, utiliza o mês corrente.
    if (!inicioInformado && !fimInformado) {
        const hoje = obterHoje();

        const ano = hoje.getUTCFullYear();
        const mes = hoje.getUTCMonth();

        inicio = criarData(ano, mes, 1);
        fim = criarData(ano, mes + 1, 0);
    } else {
        inicio = validarData(inicioInformado, "inicio");
        fim = validarData(fimInformado, "fim");
    }

    if (inicio > fim) {
        throw new AppError(400, "Dados inválidos.", {
            inicio: "A data inicial não pode ser posterior à data final."
        });
    }

    return {
        inicio,
        fim,
        whereData: {
            gte: inicio,
            lte: fim
        }
    };
}

// Calcula o período anterior.
// Meses completos são comparados com o mês anterior.
// Intervalos personalizados são comparados com outro
// intervalo de exatamente a mesma duração.
function calcularPeriodoAnterior(inicio, fim) {
    const ano = inicio.getUTCFullYear();
    const mes = inicio.getUTCMonth();

    const inicioDia = inicio.getUTCDate();
    const fimDia = fim.getUTCDate();

    const inicioMesCompleto = inicioDia === 1;

    const fimMesCompleto =
        inicio.getUTCMonth() === fim.getUTCMonth() &&
        fimDia === ultimoDiaDoMes(
            fim.getUTCFullYear(),
            fim.getUTCMonth()
        );

    if (inicioMesCompleto && fimMesCompleto) {
        const anteriorInicio = criarData(ano, mes - 1, 1);
        const anteriorFim = criarData(ano, mes, 0);

        return {
            inicio: anteriorInicio,
            fim: anteriorFim,
            whereData: {
                gte: anteriorInicio,
                lte: anteriorFim
            }
        };
    }

    const diasPeriodo = Math.round(
        (fim.getTime() - inicio.getTime()) / 86400000
    ) + 1;

    const anteriorFim = adicionarDias(inicio, -1);

    const anteriorInicio = adicionarDias(
        anteriorFim,
        -(diasPeriodo - 1)
    );

    return {
        inicio: anteriorInicio,
        fim: anteriorFim,
        whereData: {
            gte: anteriorInicio,
            lte: anteriorFim
        }
    };
}

// ======================================================
// MAPAS DE AGREGAÇÃO
// ======================================================

function criarMapaAgrupamento(grupos, campoId) {
    return new Map(
        grupos.map(grupo => [
            grupo[campoId],
            decimalParaCentavos(grupo._sum.valor)
        ])
    );
}

function idsUnicos(...mapas) {
    return [
        ...new Set(
            mapas.flatMap(mapa => [...mapa.keys()])
        )
    ];
}

// ======================================================
// RF7 — RELATÓRIO POR CATEGORIA
// GET /api/relatorios/categorias
// ======================================================

export async function relatorioPorCategoria(
    usuarioId,
    filtros = {}
) {
    const idUsuario = validarUsuarioId(usuarioId);

    const periodo = obterPeriodo(filtros);

    const periodoAnterior = calcularPeriodoAnterior(
        periodo.inicio,
        periodo.fim
    );

    return prisma.$transaction(async (tx) => {
        const [saidasAtuais, saidasAnteriores,
            entradasAtuais, entradasAnteriores] = await Promise.all([

                // Saídas do período atual.
                tx.lancamento.groupBy({
                    by: ["categoriaId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "saida",
                        data: periodo.whereData
                    },
                    _sum: {
                        valor: true
                    }
                }),

                // Saídas do período anterior.
                tx.lancamento.groupBy({
                    by: ["categoriaId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "saida",
                        data: periodoAnterior.whereData
                    },
                    _sum: {
                        valor: true
                    }
                }),

                // Entradas do período atual.
                tx.lancamento.groupBy({
                    by: ["categoriaId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "entrada",
                        data: periodo.whereData
                    },
                    _sum: {
                        valor: true
                    }
                }),

                // Entradas do período anterior.
                tx.lancamento.groupBy({
                    by: ["categoriaId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "entrada",
                        data: periodoAnterior.whereData
                    },
                    _sum: {
                        valor: true
                    }
                })
            ]);

        const mapaSaidasAtuais = criarMapaAgrupamento(
            saidasAtuais,
            "categoriaId"
        );

        const mapaSaidasAnteriores = criarMapaAgrupamento(
            saidasAnteriores,
            "categoriaId"
        );

        const mapaEntradasAtuais = criarMapaAgrupamento(
            entradasAtuais,
            "categoriaId"
        );

        const mapaEntradasAnteriores = criarMapaAgrupamento(
            entradasAnteriores,
            "categoriaId"
        );

        const ids = idsUnicos(
            mapaSaidasAtuais,
            mapaSaidasAnteriores,
            mapaEntradasAtuais,
            mapaEntradasAnteriores
        );

        const categorias = ids.length > 0
            ? await tx.categoria.findMany({
                where: {
                    usuarioId: idUsuario,
                    id: {
                        in: ids
                    }
                },
                select: {
                    id: true,
                    nome: true,
                    tipo: true
                }
            })
            : [];

        const categoriasPorId = new Map(
            categorias.map(categoria => [
                categoria.id,
                categoria
            ])
        );

        const totalSaidas = somarValores(saidasAtuais);
        const totalEntradas = somarValores(entradasAtuais);

        const totalSaidasAnterior = somarValores(saidasAnteriores);
        const totalEntradasAnterior = somarValores(entradasAnteriores);

        // Constrói as categorias de um tipo específico.
        function montarCategorias(
            tipo,
            atual,
            anterior,
            incluirPercentual
        ) {
            const mapaCategorias = new Map();

            for (const id of ids) {
                const categoria = categoriasPorId.get(id);

                if (!categoria || categoria.tipo !== tipo) {
                    continue;
                }

                const valorAtual = atual.get(id) ?? 0n;
                const valorAnterior = anterior.get(id) ?? 0n;

                mapaCategorias.set(id, {
                    id: categoria.id,
                    nome: categoria.nome,

                    total: centavosParaDecimal(valorAtual),

                    ...(incluirPercentual && {
                        percentual: calcularPercentual(
                            valorAtual,
                            totalSaidas
                        )
                    }),

                    periodoAnterior: centavosParaDecimal(
                        valorAnterior
                    ),

                    variacao: centavosParaDecimal(
                        valorAtual - valorAnterior
                    ),

                    variacaoPercentual:
                        calcularVariacaoPercentual(
                            valorAtual,
                            valorAnterior
                        ),

                    tendencia: obterTendencia(
                        valorAtual,
                        valorAnterior
                    ),

                    // Campo interno usado para ordenação.
                    _valorAtual: valorAtual
                });
            }

            return [...mapaCategorias.values()]
                .sort((a, b) => {
                    if (a._valorAtual > b._valorAtual) return -1;
                    if (a._valorAtual < b._valorAtual) return 1;

                    return a.nome.localeCompare(b.nome);
                })
                .map(({ _valorAtual, ...categoria }) => categoria);
        }

        const despesasPorCategoria = montarCategorias(
            "saida",
            mapaSaidasAtuais,
            mapaSaidasAnteriores,
            true
        );

        const entradasPorCategoria = montarCategorias(
            "entrada",
            mapaEntradasAtuais,
            mapaEntradasAnteriores,
            false
        );

        return {
            periodo: {
                inicio: formatarData(periodo.inicio),
                fim: formatarData(periodo.fim)
            },

            periodoAnterior: {
                inicio: formatarData(periodoAnterior.inicio),
                fim: formatarData(periodoAnterior.fim)
            },

            totalSaidas: centavosParaDecimal(totalSaidas),

            totalSaidasPeriodoAnterior:
                centavosParaDecimal(totalSaidasAnterior),

            categorias: despesasPorCategoria,

            totalEntradas: centavosParaDecimal(totalEntradas),

            totalEntradasPeriodoAnterior:
                centavosParaDecimal(totalEntradasAnterior),

            entradasPorCategoria
        };
    });
}

// ======================================================
// RF8 — RELATÓRIO POR FONTE/DESTINO
// GET /api/relatorios/fontes-destinos
// ======================================================

export async function relatorioPorFonteDestino(
    usuarioId,
    filtros = {}
) {
    const idUsuario = validarUsuarioId(usuarioId);

    const periodo = obterPeriodo(filtros);

    return prisma.$transaction(async (tx) => {
        const [entradas, saidas, fontesDestinos] =
            await Promise.all([

                // Entradas agrupadas por fonte.
                tx.lancamento.groupBy({
                    by: ["fonteDestinoId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "entrada",
                        data: periodo.whereData
                    },
                    _sum: {
                        valor: true
                    }
                }),

                // Saídas agrupadas por destino.
                tx.lancamento.groupBy({
                    by: ["fonteDestinoId"],
                    where: {
                        usuarioId: idUsuario,
                        tipo: "saida",
                        data: periodo.whereData
                    },
                    _sum: {
                        valor: true
                    }
                }),

                // Fontes e destinos do usuário.
                // Inclui contas mesmo que não tenham movimentações.
                tx.fonteDestino.findMany({
                    where: {
                        usuarioId: idUsuario
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo: true
                    }
                })
            ]);

        const mapaFontes = new Map(
            fontesDestinos.map(fonte => [
                fonte.id,
                fonte
            ])
        );

        const mapaEntradas = criarMapaAgrupamento(
            entradas,
            "fonteDestinoId"
        );

        const mapaSaidas = criarMapaAgrupamento(
            saidas,
            "fonteDestinoId"
        );

        const totalEntradas = somarValores(entradas);
        const totalSaidas = somarValores(saidas);

        const entradasPorFonte = entradas
            .map(grupo => {
                const fonte = mapaFontes.get(
                    grupo.fonteDestinoId
                );

                if (!fonte) {
                    return null;
                }

                return {
                    id: fonte.id,
                    nome: fonte.nome,
                    tipo: fonte.tipo,
                    total: centavosParaDecimal(
                        decimalParaCentavos(grupo._sum.valor)
                    )
                };
            })
            .filter(Boolean)
            .sort((a, b) => (
                Number(b.total) - Number(a.total)
            ));

        const saidasPorDestino = saidas
            .map(grupo => {
                const destino = mapaFontes.get(
                    grupo.fonteDestinoId
                );

                if (!destino) {
                    return null;
                }

                return {
                    id: destino.id,
                    nome: destino.nome,
                    tipo: destino.tipo,
                    total: centavosParaDecimal(
                        decimalParaCentavos(grupo._sum.valor)
                    )
                };
            })
            .filter(Boolean)
            .sort((a, b) => (
                Number(b.total) - Number(a.total)
            ));

        // Saldo individual de cada conta.
        // Contas sem movimentações também aparecem.
        const saldoPorConta = fontesDestinos
            .filter(fonte => fonte.tipo === "conta")
            .map(conta => {
                const valorEntradas =
                    mapaEntradas.get(conta.id) ?? 0n;

                const valorSaidas =
                    mapaSaidas.get(conta.id) ?? 0n;

                return {
                    id: conta.id,
                    nome: conta.nome,

                    totalEntradas: centavosParaDecimal(
                        valorEntradas
                    ),

                    totalSaidas: centavosParaDecimal(
                        valorSaidas
                    ),

                    saldo: centavosParaDecimal(
                        valorEntradas - valorSaidas
                    )
                };
            })
            .sort((a, b) => (
                Number(b.saldo) - Number(a.saldo)
            ));

        return {
            periodo: {
                inicio: formatarData(periodo.inicio),
                fim: formatarData(periodo.fim)
            },

            totalEntradas: centavosParaDecimal(totalEntradas),

            totalSaidas: centavosParaDecimal(totalSaidas),

            saldoPeriodo: centavosParaDecimal(
                totalEntradas - totalSaidas
            ),

            entradasPorFonte,

            saidasPorDestino,

            saldoPorConta
        };
    });
}

// ======================================================
// RF9 — CÁLCULO DAS FATURAS
// ======================================================

// Representa um mês como um número linear.
// Exemplo: dezembro de 2026 -> 2026 * 12 + 11.
function indiceMes(ano, mes) {
    return ano * 12 + mes;
}

function decomporIndiceMes(indice) {
    const ano = Math.floor(indice / 12);

    const mes = indice - ano * 12;

    return { ano, mes };
}

// Cria uma data segura, ajustando dias inexistentes.
// Exemplo: 31/02 -> 28/02 ou 29/02.
function dataSegura(ano, mes, dia) {
    const mesNormalizado = decomporIndiceMes(
        indiceMes(ano, mes)
    );

    const ultimoDia = ultimoDiaDoMes(
        mesNormalizado.ano,
        mesNormalizado.mes
    );

    return criarData(
        mesNormalizado.ano,
        mesNormalizado.mes,
        Math.min(dia, ultimoDia)
    );
}

// Converte a data de compra para YYYY-MM-DD.
function obterDataCompraISO(dataCompra) {
    if (dataCompra instanceof Date) {
        return formatarData(dataCompra);
    }

    const resultado = validarData(dataCompra, "dataCompra");

    return formatarData(resultado);
}

// Calcula a fatura de uma parcela específica.
// Esta função segue a regra de fechamento da professora.
export function calcularFatura(
    dataCompra,
    cartao,
    numeroParcela = 1
) {
    const dataISO = obterDataCompraISO(dataCompra);

    const [ano, mes, dia] = dataISO
        .split("-")
        .map(Number);

    const diaFechamento = Number(cartao.diaFechamento);
    const diaVencimento = Number(cartao.diaVencimento);

    const parcela = Number(numeroParcela);

    if (
        !Number.isInteger(diaFechamento) ||
        diaFechamento < 1 ||
        diaFechamento > 31 ||
        !Number.isInteger(diaVencimento) ||
        diaVencimento < 1 ||
        diaVencimento > 31 ||
        !Number.isInteger(parcela) ||
        parcela < 1
    ) {
        throw new Error(
            "Dados inválidos para calcular a fatura."
        );
    }

    const mesCompra = indiceMes(ano, mes - 1);

    const fechamentoDoMesCompra = dataSegura(
        ano,
        mes - 1,
        diaFechamento
    );

    // Antes do fechamento: fatura do mesmo ciclo.
    // No fechamento ou depois: ciclo seguinte.
    let mesFechamento = dia <
        fechamentoDoMesCompra.getUTCDate()
        ? mesCompra
        : mesCompra + 1;

    // Cada parcela seguinte cai no mês seguinte.
    mesFechamento += parcela - 1;

    const componentesFechamento = decomporIndiceMes(
        mesFechamento
    );

    const fechamento = dataSegura(
        componentesFechamento.ano,
        componentesFechamento.mes,
        diaFechamento
    );

    // Se o vencimento ocorrer depois do fechamento,
    // vence no mesmo mês.
    // Caso contrário, vence no mês seguinte.
    const mesVencimento = diaVencimento > diaFechamento
        ? mesFechamento
        : mesFechamento + 1;

    const componentesVencimento = decomporIndiceMes(
        mesVencimento
    );

    const vencimento = dataSegura(
        componentesVencimento.ano,
        componentesVencimento.mes,
        diaVencimento
    );

    const fechamentoISO = formatarData(fechamento);
    const vencimentoISO = formatarData(vencimento);

    return {
        referencia: vencimentoISO.slice(0, 7),
        fechamento: fechamentoISO,
        vencimento: vencimentoISO
    };
}

// ======================================================
// GERAÇÃO DOS CICLOS FUTUROS DE UM CARTÃO
// ======================================================

// A fatura atual é o próximo ciclo ainda aberto.
// Quando hoje coincide com o fechamento, o ciclo é
// considerado fechado e o atual passa a ser o seguinte.
function obterProximoFechamento(hoje, cartao) {
    const ano = hoje.getUTCFullYear();
    const mes = hoje.getUTCMonth();

    let candidato = dataSegura(
        ano,
        mes,
        cartao.diaFechamento
    );

    if (candidato <= hoje) {
        candidato = dataSegura(
            ano,
            mes + 1,
            cartao.diaFechamento
        );
    }

    return candidato;
}

function criarCicloFatura(fechamento, cartao, status) {
    const fechamentoISO = formatarData(fechamento);

    const ano = fechamento.getUTCFullYear();
    const mes = fechamento.getUTCMonth();

    const mesFechamento = indiceMes(ano, mes);

    const mesVencimento =
        cartao.diaVencimento > cartao.diaFechamento
            ? mesFechamento
            : mesFechamento + 1;

    const componentesVencimento = decomporIndiceMes(
        mesVencimento
    );

    const vencimento = dataSegura(
        componentesVencimento.ano,
        componentesVencimento.mes,
        cartao.diaVencimento
    );

    return {
        referencia: formatarData(vencimento).slice(0, 7),
        status,
        fechamento: fechamentoISO,
        vencimento: formatarData(vencimento),
        lancamentos: [],
        _totalCentavos: 0n
    };
}

function gerarCiclosFatura(hoje, cartao, mesesFuturos) {
    const primeiroFechamento = obterProximoFechamento(
        hoje,
        cartao
    );

    const primeiroIndice = indiceMes(
        primeiroFechamento.getUTCFullYear(),
        primeiroFechamento.getUTCMonth()
    );

    const quantidade = mesesFuturos + 1;

    return Array.from({ length: quantidade }, (_, indice) => {
        const componentes = decomporIndiceMes(
            primeiroIndice + indice
        );

        const fechamento = dataSegura(
            componentes.ano,
            componentes.mes,
            cartao.diaFechamento
        );

        return criarCicloFatura(
            fechamento,
            cartao,
            indice === 0 ? "aberta" : "prevista"
        );
    });
}

// ======================================================
// VALIDAR QUANTIDADE DE MESES
// ======================================================

function validarMeses(meses) {
    if (
        meses === undefined ||
        meses === null ||
        meses === ""
    ) {
        return MESES_MINIMOS_FATURAS;
    }

    const texto = String(meses).trim();

    if (!/^\d+$/.test(texto)) {
        throw new AppError(400, "Dados inválidos.", {
            meses: "Informe uma quantidade inteira de meses."
        });
    }

    const valor = Number(texto);

    if (
        !Number.isInteger(valor) ||
        valor < MESES_MINIMOS_FATURAS ||
        valor > MESES_MAXIMOS_FATURAS
    ) {
        throw new AppError(400, "Dados inválidos.", {
            meses: `Informe entre ${MESES_MINIMOS_FATURAS} e ${MESES_MAXIMOS_FATURAS} meses futuros.`
        });
    }

    return valor;
}

// ======================================================
// RF9 — PREVISÃO DAS FATURAS DOS CARTÕES
// GET /api/relatorios/faturas
// ======================================================

export async function relatorioFaturas(usuarioId, filtros = {}) {
    const idUsuario = validarUsuarioId(usuarioId);

    const mesesFuturos = validarMeses(filtros.meses);

    const hoje = obterHoje();
    const hojeISO = formatarData(hoje);

    // Busca todos os cartões do usuário.
    const cartoes = await prisma.fonteDestino.findMany({
        where: {
            usuarioId: idUsuario,
            tipo: "cartao_credito"
        },
        orderBy: {
            nome: "asc"
        },
        select: {
            id: true,
            nome: true,
            tipo: true,
            diaFechamento: true,
            diaVencimento: true,
            limite: true
        }
    });

    if (cartoes.length === 0) {
        return {
            dataReferencia: hojeISO,
            mesesPrevistos: mesesFuturos,
            cartoes: []
        };
    }

    const idsCartoes = cartoes.map(cartao => cartao.id);

    // Cada parcela armazenada é um lançamento separado.
    // Precisamos consultar todas para calcular tanto as
    // faturas quanto o limite comprometido.
    const lancamentos = await prisma.lancamento.findMany({
        where: {
            usuarioId: idUsuario,
            tipo: "saida",
            fonteDestinoId: {
                in: idsCartoes
            }
        },
        select: {
            id: true,
            descricao: true,
            valor: true,
            data: true,
            fonteDestinoId: true,
            parcelaAtual: true,
            totalParcelas: true,
            grupoParcelamento: true
        },
        orderBy: [
            { data: "asc" },
            { id: "asc" }
        ]
    });

    const lancamentosPorCartao = new Map();

    for (const lancamento of lancamentos) {
        if (!lancamentosPorCartao.has(lancamento.fonteDestinoId)) {
            lancamentosPorCartao.set(
                lancamento.fonteDestinoId,
                []
            );
        }

        lancamentosPorCartao
            .get(lancamento.fonteDestinoId)
            .push(lancamento);
    }

    const resultadoCartoes = cartoes.map(cartao => {
        const ciclos = gerarCiclosFatura(
            hoje,
            cartao,
            mesesFuturos
        );

        const ciclosPorFechamento = new Map(
            ciclos.map(ciclo => [
                ciclo.fechamento,
                ciclo
            ])
        );

        const compras = lancamentosPorCartao.get(cartao.id) ?? [];

        let limiteUtilizadoCentavos = 0n;

        for (const lancamento of compras) {
            const dataCompra = formatarData(lancamento.data);

            const fatura = calcularFatura(
                dataCompra,
                cartao,
                lancamento.parcelaAtual
            );

            const valorCentavos = decimalParaCentavos(
                lancamento.valor
            );

            // Uma parcela compromete o limite enquanto
            // seu vencimento ainda não tiver passado.
            if (fatura.vencimento >= hojeISO) {
                limiteUtilizadoCentavos += valorCentavos;
            }

            // Localiza a fatura correspondente ao fechamento.
            const ciclo = ciclosPorFechamento.get(
                fatura.fechamento
            );

            if (!ciclo) {
                continue;
            }

            ciclo.lancamentos.push({
                id: lancamento.id,

                descricao: lancamento.descricao,

                identificacao:
                    `${lancamento.descricao} — ` +
                    `${lancamento.parcelaAtual}/` +
                    `${lancamento.totalParcelas}`,

                valor: centavosParaDecimal(
                    valorCentavos
                ),

                dataCompra,

                parcelaAtual: lancamento.parcelaAtual,

                totalParcelas: lancamento.totalParcelas,

                grupoParcelamento: lancamento.grupoParcelamento
            });

            ciclo._totalCentavos += valorCentavos;
        }

        const limiteCentavos = decimalParaCentavos(
            cartao.limite
        );

        const faturas = ciclos.map(ciclo => ({
            referencia: ciclo.referencia,

            status: ciclo.status,

            fechamento: ciclo.fechamento,

            vencimento: ciclo.vencimento,

            quantidadeLancamentos: ciclo.lancamentos.length,

            lancamentos: ciclo.lancamentos,

            valorTotal: centavosParaDecimal(
                ciclo._totalCentavos
            )
        }));

        return {
            id: cartao.id,
            nome: cartao.nome,

            diaFechamento: cartao.diaFechamento,
            diaVencimento: cartao.diaVencimento,

            limite: centavosParaDecimal(limiteCentavos),

            limiteUtilizado: centavosParaDecimal(
                limiteUtilizadoCentavos
            ),

            limiteDisponivel: centavosParaDecimal(
                limiteCentavos - limiteUtilizadoCentavos
            ),

            faturaAtual: faturas[0],

            proximasFaturas: faturas.slice(1)
        };
    });

    return {
        dataReferencia: hojeISO,
        mesesPrevistos: mesesFuturos,
        cartoes: resultadoCartoes
    };
}
