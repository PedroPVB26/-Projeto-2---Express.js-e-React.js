
import { randomUUID } from "node:crypto";

import { prisma } from "../config/prisma.js";

const TIPOS_VALIDOS = ["entrada", "saida"];
const ITENS_POR_PAGINA = 10;
const MAX_ITENS_POR_PAGINA = 100;

// ======================================================
// ERROS E VALIDAÇÕES
// ======================================================

function erroValidacao(mensagem, campo) {
    const erro = new Error(mensagem);

    erro.code = "VALIDATION_ERROR";
    erro.campo = campo;

    return erro;
}

function erroNaoEncontrado(mensagem, campo) {
    const erro = new Error(mensagem);

    erro.code = "NOT_FOUND";
    erro.campo = campo;

    return erro;
}

function validarId(id, campo = "id") {
    const valor = Number(id);

    if (!Number.isInteger(valor) || valor <= 0) {
        throw erroValidacao("ID inválido.", campo);
    }

    return valor;
}

function validarTipo(tipo) {
    const valor = String(tipo ?? "").trim().toLowerCase();

    if (!TIPOS_VALIDOS.includes(valor)) {
        throw erroValidacao(
            "Tipo deve ser entrada ou saida.",
            "tipo"
        );
    }

    return valor;
}

function validarDescricao(descricao) {
    const valor = String(descricao ?? "").trim();

    if (!valor) {
        throw erroValidacao(
            "Descrição é obrigatória.",
            "descricao"
        );
    }

    if (valor.length > 120) {
        throw erroValidacao(
            "Descrição deve possuir no máximo 120 caracteres.",
            "descricao"
        );
    }

    return valor;
}

function validarInteiroPositivo(valor, campo) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        throw erroValidacao(
            "Informe um número inteiro positivo.",
            campo
        );
    }

    return numero;
}

// ======================================================
// VALORES MONETÁRIOS
// Trabalhamos com centavos para evitar erros de ponto
// flutuante durante a divisão das parcelas.
// ======================================================

function converterParaCentavos(valor) {
    const texto = String(valor ?? "").trim().replace(",", ".");

    if (!/^\d{1,10}(\.\d{1,2})?$/.test(texto)) {
        throw erroValidacao(
            "Valor monetário inválido. Utilize até duas casas decimais.",
            "valor"
        );
    }

    const [inteiros, decimais = ""] = texto.split(".");

    const centavos =
        BigInt(inteiros) * 100n +
        BigInt(decimais.padEnd(2, "0"));

    if (centavos <= 0n) {
        throw erroValidacao(
            "O valor deve ser maior que zero.",
            "valor"
        );
    }

    return centavos;
}

function converterParaDecimal(centavos) {
    const inteiro = centavos / 100n;
    const decimal = (centavos % 100n).toString().padStart(2, "0");

    return `${inteiro}.${decimal}`;
}

// Converte Decimal do Prisma em centavos para cálculos exatos.
function decimalParaCentavos(valor) {
    if (valor === null || valor === undefined) {
        return 0n;
    }

    const texto = valor.toFixed(2);

    const [inteiros, decimais] = texto.split(".");

    return BigInt(inteiros) * 100n + BigInt(decimais);
}

// ======================================================
// DATAS
// ======================================================

function validarData(data) {
    if (data instanceof Date) {
        if (Number.isNaN(data.getTime())) {
            throw erroValidacao("Data inválida.", "data");
        }

        return new Date(Date.UTC(
            data.getUTCFullYear(),
            data.getUTCMonth(),
            data.getUTCDate()
        ));
    }

    const texto = String(data ?? "").trim();

    // A API trabalha com datas no formato YYYY-MM-DD.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        throw erroValidacao(
            "Data inválida. Utilize o formato YYYY-MM-DD.",
            "data"
        );
    }

    const resultado = new Date(`${texto}T00:00:00.000Z`);

    if (
        Number.isNaN(resultado.getTime()) ||
        resultado.toISOString().slice(0, 10) !== texto
    ) {
        throw erroValidacao("Data inválida.", "data");
    }

    return resultado;
}

function obterPeriodoAtual() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    return {
        inicio: new Date(Date.UTC(ano, mes, 1)),
        fim: new Date(Date.UTC(ano, mes + 1, 0))
    };
}

// ======================================================
// CONSULTAS E FILTROS
// ======================================================


function montarWhere(usuarioId, filtros = {}, incluirTipo = true) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const where = {
        usuarioId: idUsuario
    };

    // Verifica se o filtro foi realmente informado.
    // Trata undefined, null e strings vazias.
    const temValor = (valor) =>
        valor !== undefined &&
        valor !== null &&
        String(valor).trim() !== "";

    let inicio = temValor(filtros.inicio)
        ? filtros.inicio
        : undefined;

    let fim = temValor(filtros.fim)
        ? filtros.fim
        : undefined;

    // Por padrão, considera o mês atual quando nenhuma
    // data foi informada.
    if (!inicio && !fim) {
        const periodo = obterPeriodoAtual();

        inicio = periodo.inicio;
        fim = periodo.fim;
    }

    if (inicio) {
        where.data = {
            ...(where.data ?? {}),
            gte: validarData(inicio)
        };
    }

    if (fim) {
        where.data = {
            ...(where.data ?? {}),
            lte: validarData(fim)
        };
    }

    if (
        where.data?.gte &&
        where.data?.lte &&
        where.data.gte > where.data.lte
    ) {
        throw erroValidacao(
            "A data inicial não pode ser posterior à data final.",
            "inicio"
        );
    }

    // Filtro por tipo.
    if (incluirTipo && temValor(filtros.tipo)) {
        where.tipo = validarTipo(filtros.tipo);
    }

    // Filtro por categoria.
    if (temValor(filtros.categoriaId)) {
        where.categoriaId = validarId(
            filtros.categoriaId,
            "categoriaId"
        );
    }

    // Filtro por fonte/destino.
    if (temValor(filtros.fonteDestinoId)) {
        where.fonteDestinoId = validarId(
            filtros.fonteDestinoId,
            "fonteDestinoId"
        );
    }

    return where;
}


const RELACIONAMENTOS_LISTA = {
    categoria: {
        select: {
            id: true,
            nome: true,
            tipo: true
        }
    },
    fonteDestino: {
        select: {
            id: true,
            nome: true,
            tipo: true
        }
    }
};

// ======================================================
// VALIDAR RELACIONAMENTOS
// ======================================================

async function validarRelacionamentos(
    client,
    usuarioId,
    tipo,
    categoriaId,
    fonteDestinoId,
    totalParcelas = 1
) {
    const [categoria, fonteDestino] = await Promise.all([
        client.categoria.findFirst({
            where: {
                id: categoriaId,
                usuarioId
            }
        }),

        client.fonteDestino.findFirst({
            where: {
                id: fonteDestinoId,
                usuarioId
            }
        })
    ]);

    if (!categoria) {
        throw erroNaoEncontrado(
            "Categoria não encontrada para este usuário.",
            "categoriaId"
        );
    }

    if (!fonteDestino) {
        throw erroNaoEncontrado(
            "Fonte/destino não encontrada para este usuário.",
            "fonteDestinoId"
        );
    }

    // Categoria e lançamento devem possuir o mesmo tipo.
    if (categoria.tipo !== tipo) {
        throw erroValidacao(
            "O tipo da categoria não corresponde ao tipo do lançamento.",
            "categoriaId"
        );
    }

    // Cartão de crédito representa um destino de saída.
    if (fonteDestino.tipo === "cartao_credito" && tipo !== "saida") {
        throw erroValidacao(
            "Cartão de crédito só pode ser utilizado em lançamentos de saída.",
            "fonteDestinoId"
        );
    }

    // Parcelamento só pode acontecer no cartão de crédito.
    if (
        totalParcelas > 1 &&
        fonteDestino.tipo !== "cartao_credito"
    ) {
        throw erroValidacao(
            "Parcelamento está disponível somente para cartões de crédito.",
            "totalParcelas"
        );
    }

    return {
        categoria,
        fonteDestino
    };
}

// ======================================================
// LISTAR LANÇAMENTOS
// ======================================================

export async function listarLancamentos(usuarioId, filtros = {}) {
    const where = montarWhere(usuarioId, filtros);

    const pagina = filtros.pagina === undefined ||
        filtros.pagina === null ||
        String(filtros.pagina).trim() === ""
        ? 1
        : validarInteiroPositivo(filtros.pagina, "pagina");

    const porPagina = filtros.porPagina === undefined
        ? ITENS_POR_PAGINA
        : validarInteiroPositivo(filtros.porPagina, "porPagina");

    if (porPagina > MAX_ITENS_POR_PAGINA) {
        throw erroValidacao(
            `O limite é de ${MAX_ITENS_POR_PAGINA} registros por página.`,
            "porPagina"
        );
    }

    const [dados, total] = await prisma.$transaction([
        prisma.lancamento.findMany({
            where,
            include: RELACIONAMENTOS_LISTA,
            orderBy: [
                { data: "desc" },
                { id: "desc" }
            ],
            skip: (pagina - 1) * porPagina,
            take: porPagina
        }),

        prisma.lancamento.count({
            where
        })
    ]);

    return {
        dados,
        paginacao: {
            pagina,
            porPagina,
            total,
            totalPaginas: Math.ceil(total / porPagina)
        }
    };
}

// ======================================================
// RESUMO FINANCEIRO DO PERÍODO
// Entradas, saídas e saldo.
// ======================================================

export async function resumirLancamentos(usuarioId, filtros = {}) {
    // O resumo considera todos os tipos, mesmo se a listagem
    // tiver sido filtrada especificamente por entrada ou saída.
    const where = montarWhere(usuarioId, filtros, false);

    const agrupamentos = await prisma.lancamento.groupBy({
        by: ["tipo"],
        where,
        _sum: {
            valor: true
        }
    });

    let entradas = 0n;
    let saidas = 0n;

    for (const grupo of agrupamentos) {
        const valor = decimalParaCentavos(grupo._sum.valor);

        if (grupo.tipo === "entrada") {
            entradas = valor;
        } else if (grupo.tipo === "saida") {
            saidas = valor;
        }
    }

    return {
        totalEntradas: converterParaDecimal(entradas),
        totalSaidas: converterParaDecimal(saidas),
        saldo: converterParaDecimal(entradas - saidas)
    };
}

// ======================================================
// BUSCAR LANÇAMENTO POR ID
// ======================================================

export async function buscarLancamentoPorId(usuarioId, lancamentoId) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idLancamento = validarId(lancamentoId, "lancamentoId");

    return prisma.lancamento.findFirst({
        where: {
            id: idLancamento,
            usuarioId: idUsuario
        },
        include: RELACIONAMENTOS_LISTA
    });
}

// ======================================================
// CRIAR LANÇAMENTO
// Inclui parcelamento com transação.
// ======================================================

export async function criarLancamento(usuarioId, dados) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const tipo = validarTipo(dados.tipo);
    const descricao = validarDescricao(dados.descricao);
    const valorTotal = converterParaCentavos(dados.valor);
    const data = validarData(dados.data);

    const categoriaId = validarId(dados.categoriaId, "categoriaId");
    const fonteDestinoId = validarId(
        dados.fonteDestinoId,
        "fonteDestinoId"
    );

    const totalParcelas = dados.totalParcelas === undefined
        ? 1
        : validarInteiroPositivo(dados.totalParcelas, "totalParcelas");

    if (totalParcelas > 48) {
        throw erroValidacao(
            "O número máximo de parcelas é 48.",
            "totalParcelas"
        );
    }

    // Parcelas individuais.
    // Todas recebem o mesmo UUID quando existe parcelamento.
    const grupoParcelamento = totalParcelas > 1
        ? randomUUID()
        : null;

    // Divide em centavos.
    // A diferença de arredondamento é adicionada à primeira parcela.
    const quantidadeParcelas = BigInt(totalParcelas);
    const valorBase = valorTotal / quantidadeParcelas;
    const resto = valorTotal % quantidadeParcelas;

    return prisma.$transaction(async (tx) => {
        await validarRelacionamentos(
            tx,
            idUsuario,
            tipo,
            categoriaId,
            fonteDestinoId,
            totalParcelas
        );

        const lancamentos = [];

        for (let indice = 0; indice < totalParcelas; indice++) {
            const valorParcela = valorBase + (
                indice === 0 ? resto : 0n
            );

            const lancamento = await tx.lancamento.create({
                data: {
                    usuarioId: idUsuario,
                    tipo,
                    descricao,
                    valor: converterParaDecimal(valorParcela),
                    data,
                    categoriaId,
                    fonteDestinoId,
                    parcelaAtual: indice + 1,
                    totalParcelas,
                    grupoParcelamento
                },
                include: RELACIONAMENTOS_LISTA
            });

            lancamentos.push(lancamento);
        }

        return {
            grupoParcelamento,
            lancamentos
        };
    });
}

// ======================================================
// ATUALIZAR LANÇAMENTO
// Mantém as informações de parcelamento existentes.
// ======================================================

export async function atualizarLancamento(
    usuarioId,
    lancamentoId,
    dados
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idLancamento = validarId(lancamentoId, "lancamentoId");

    return prisma.$transaction(async (tx) => {
        const atual = await tx.lancamento.findFirst({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            }
        });

        if (!atual) {
            return null;
        }

        const tipo = dados.tipo !== undefined
            ? validarTipo(dados.tipo)
            : atual.tipo;

        const descricao = dados.descricao !== undefined
            ? validarDescricao(dados.descricao)
            : atual.descricao;

        const categoriaId = dados.categoriaId !== undefined
            ? validarId(dados.categoriaId, "categoriaId")
            : atual.categoriaId;

        const fonteDestinoId = dados.fonteDestinoId !== undefined
            ? validarId(dados.fonteDestinoId, "fonteDestinoId")
            : atual.fonteDestinoId;

        await validarRelacionamentos(
            tx,
            idUsuario,
            tipo,
            categoriaId,
            fonteDestinoId,
            atual.totalParcelas
        );

        const dataAtualizacao = {
            tipo,
            descricao,
            categoriaId,
            fonteDestinoId
        };

        if (dados.valor !== undefined) {
            const centavos = converterParaCentavos(dados.valor);

            dataAtualizacao.valor = converterParaDecimal(centavos);
        }

        if (dados.data !== undefined) {
            dataAtualizacao.data = validarData(dados.data);
        }

        await tx.lancamento.updateMany({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            },
            data: dataAtualizacao
        });

        return tx.lancamento.findFirst({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            },
            include: RELACIONAMENTOS_LISTA
        });
    });
}

// ======================================================
// EXCLUIR LANÇAMENTO
// Pode excluir somente uma parcela ou todas do grupo.
// ======================================================

export async function excluirLancamento(
    usuarioId,
    lancamentoId,
    todasParcelas = false
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idLancamento = validarId(lancamentoId, "lancamentoId");

    return prisma.$transaction(async (tx) => {
        const lancamento = await tx.lancamento.findFirst({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            }
        });

        if (!lancamento) {
            return null;
        }

        const excluirGrupo = (
            todasParcelas === true &&
            lancamento.grupoParcelamento !== null
        );

        const resultado = await tx.lancamento.deleteMany({
            where: excluirGrupo
                ? {
                    usuarioId: idUsuario,
                    grupoParcelamento: lancamento.grupoParcelamento
                }
                : {
                    id: idLancamento,
                    usuarioId: idUsuario
                }
        });

        return {
            quantidadeExcluida: resultado.count,
            todasParcelas: excluirGrupo
        };
    });
}
