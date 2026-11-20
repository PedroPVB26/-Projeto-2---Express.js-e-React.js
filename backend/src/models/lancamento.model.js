
import { randomUUID } from "node:crypto";

import { prisma } from "../config/prisma.js";
import { AppError } from "../config/erro.js";

const TIPOS_VALIDOS = ["entrada", "saida"];

const ITENS_POR_PAGINA = 10;

const MAX_PAGINA = Math.floor(Number.MAX_SAFE_INTEGER / ITENS_POR_PAGINA);

// ======================================================
// VALIDAÇÕES GERAIS
// ======================================================

function erroValidacao(campos) {
    throw new AppError(400, "Dados inválidos.", campos);
}

function validarId(id, campo = "id") {
    const valor = String(id ?? "").trim();

    if (!/^[1-9]\d*$/.test(valor)) {
        erroValidacao({
            [campo]: "Informe um identificador inteiro positivo."
        });
    }

    const numero = Number(valor);

    if (!Number.isSafeInteger(numero)) {
        erroValidacao({
            [campo]: "Identificador inválido."
        });
    }

    return numero;
}

function validarTipo(tipo) {
    if (typeof tipo !== "string") {
        erroValidacao({
            tipo: "Informe o tipo entrada ou saida."
        });
    }

    const valor = tipo.trim().toLowerCase();

    if (!TIPOS_VALIDOS.includes(valor)) {
        erroValidacao({
            tipo: "O tipo deve ser entrada ou saida."
        });
    }

    return valor;
}

function validarDescricao(descricao) {
    if (typeof descricao !== "string") {
        erroValidacao({
            descricao: "A descrição é obrigatória."
        });
    }

    const valor = descricao.trim();

    if (!valor) {
        erroValidacao({
            descricao: "A descrição é obrigatória."
        });
    }

    if (valor.length > 120) {
        erroValidacao({
            descricao: "A descrição deve possuir no máximo 120 caracteres."
        });
    }

    return valor;
}

// ======================================================
// VALIDAÇÃO MONETÁRIA
// Todos os cálculos de parcelamento são realizados
// utilizando BigInt, evitando imprecisão de float.
// ======================================================

function validarValor(valor) {
    if (
        typeof valor !== "string" &&
        typeof valor !== "number"
    ) {
        erroValidacao({
            valor: "Informe um valor monetário válido."
        });
    }

    if (typeof valor === "number" && !Number.isFinite(valor)) {
        erroValidacao({
            valor: "Informe um valor monetário válido."
        });
    }

    const texto = String(valor).trim().replace(",", ".");

    // NUMERIC(12,2): até 10 dígitos inteiros e 2 decimais.
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(texto)) {
        erroValidacao({
            valor: "Informe um valor válido com até duas casas decimais."
        });
    }

    const [inteiros, decimais = ""] = texto.split(".");

    const centavos =
        BigInt(inteiros) * 100n +
        BigInt(decimais.padEnd(2, "0"));

    if (centavos <= 0n) {
        erroValidacao({
            valor: "O valor deve ser maior que zero."
        });
    }

    return centavos;
}

// Converte centavos em string decimal.
// Também permite representar saldos negativos.
function centavosParaDecimal(centavos) {
    const negativo = centavos < 0n;

    const absoluto = negativo ? -centavos : centavos;

    const inteiros = absoluto / 100n;

    const decimais = (absoluto % 100n)
        .toString()
        .padStart(2, "0");

    return `${negativo ? "-" : ""}${inteiros}.${decimais}`;
}

// Converte Prisma Decimal em BigInt de centavos.
function decimalParaCentavos(valor) {
    if (valor === null || valor === undefined) {
        return 0n;
    }

    const texto = valor.toFixed(2);
    const [inteiros, decimais] = texto.split(".");

    const resultado =
        BigInt(inteiros) * 100n +
        BigInt(decimais);

    return resultado;
}

// ======================================================
// VALIDAÇÃO DE PARCELAMENTO
// ======================================================

function validarTotalParcelas(totalParcelas) {
    if (
        totalParcelas === undefined ||
        totalParcelas === null ||
        totalParcelas === ""
    ) {
        return 1;
    }

    const texto = String(totalParcelas).trim();

    if (!/^\d+$/.test(texto)) {
        erroValidacao({
            totalParcelas: "Informe um número inteiro de parcelas."
        });
    }

    const valor = Number(texto);

    if (!Number.isInteger(valor) || valor < 1 || valor > 48) {
        erroValidacao({
            totalParcelas: "O número de parcelas deve estar entre 1 e 48."
        });
    }

    return valor;
}

// ======================================================
// DATAS
// O PostgreSQL utiliza DATE.
// Trabalhamos com datas UTC para evitar problemas
// de conversão de fuso horário.
// ======================================================

function validarData(data) {
    if (typeof data !== "string") {
        erroValidacao({
            data: "A data é obrigatória e deve estar no formato YYYY-MM-DD."
        });
    }

    const texto = data.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        erroValidacao({
            data: "Utilize o formato YYYY-MM-DD."
        });
    }

    const resultado = new Date(`${texto}T00:00:00.000Z`);

    if (
        Number.isNaN(resultado.getTime()) ||
        resultado.toISOString().slice(0, 10) !== texto
    ) {
        erroValidacao({
            data: "Informe uma data válida."
        });
    }

    return resultado;
}

function dataParaTexto(data) {
    return data.toISOString().slice(0, 10);
}

// Obtém o mês corrente considerando o horário de Brasília,
// independentemente do fuso horário do servidor.
function obterPeriodoAtual() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit"
    }).formatToParts(new Date());

    const ano = Number(
        partes.find(parte => parte.type === "year").value
    );

    const mes = Number(
        partes.find(parte => parte.type === "month").value
    );

    const inicio = new Date(Date.UTC(ano, mes - 1, 1));

    const fim = new Date(Date.UTC(ano, mes, 0));

    return { inicio, fim };
}

// Valida os parâmetros de data da listagem.
function montarPeriodo(filtros = {}) {
    const inicioInformado = obterParametro(
        filtros.inicio,
        "inicio"
    );

    const fimInformado = obterParametro(
        filtros.fim,
        "fim"
    );

    let inicio;
    let fim;

    if (!inicioInformado && !fimInformado) {
        const periodo = obterPeriodoAtual();

        inicio = periodo.inicio;
        fim = periodo.fim;
    } else {
        inicio = inicioInformado
            ? validarData(inicioInformado)
            : null;

        fim = fimInformado
            ? validarData(fimInformado)
            : null;
    }

    if (inicio && fim && inicio > fim) {
        erroValidacao({
            inicio: "A data inicial não pode ser posterior à data final."
        });
    }

    const whereData = {};

    if (inicio) {
        whereData.gte = inicio;
    }

    if (fim) {
        whereData.lte = fim;
    }

    return {
        inicio,
        fim,
        whereData
    };
}

// ======================================================
// PARÂMETROS DE CONSULTA
// Trata strings vazias e parâmetros inválidos.
// ======================================================

function obterParametro(valor, campo) {
    if (valor === undefined || valor === null) {
        return undefined;
    }

    if (typeof valor !== "string") {
        erroValidacao({
            [campo]: "Informe somente um valor para este parâmetro."
        });
    }

    const resultado = valor.trim();

    return resultado === "" ? undefined : resultado;
}

function validarPagina(pagina) {
    const valor = obterParametro(pagina, "pagina");

    if (!valor) {
        return 1;
    }

    if (!/^[1-9]\d*$/.test(valor)) {
        erroValidacao({
            pagina: "A página deve ser um número inteiro positivo."
        });
    }

    const numero = Number(valor);

    if (!Number.isSafeInteger(numero) || numero > MAX_PAGINA) {
        erroValidacao({
            pagina: "Número de página inválido."
        });
    }

    return numero;
}

// ======================================================
// RELACIONAMENTOS
// Verifica a existência e a titularidade dos registros.
// ======================================================

async function validarRelacionamentos(
    client,
    usuarioId,
    tipo,
    categoriaId,
    fonteDestinoId,
    totalParcelas
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

    const campos = {};

    if (!categoria) {
        campos.categoriaId =
            "A categoria não existe ou não pertence ao usuário autenticado.";
    }

    if (!fonteDestino) {
        campos.fonteDestinoId =
            "A fonte/destino não existe ou não pertence ao usuário autenticado.";
    }

    if (Object.keys(campos).length > 0) {
        throw new AppError(
            404,
            "Categoria ou fonte/destino não encontrada.",
            campos
        );
    }

    // Categoria e lançamento precisam possuir o mesmo tipo.
    if (categoria.tipo !== tipo) {
        const tipos = {
            entrada: "entrada",
            saida: "saída"
        };

        throw new AppError(400, "Dados inválidos.", {
            categoriaId:
                `A categoria informada é de ${tipos[categoria.tipo]}, ` +
                `mas o lançamento é de ${tipos[tipo]}.`
        });
    }

    // Uma fonte do tipo renda não pode representar uma saída.
    if (tipo === "saida" && fonteDestino.tipo === "renda") {
        erroValidacao({
            fonteDestinoId:
                "Uma fonte do tipo renda não pode ser utilizada em um lançamento de saída."
        });
    }

    // Um cartão de crédito representa um destino de saída.
    if (tipo === "entrada" && fonteDestino.tipo === "cartao_credito") {
        erroValidacao({
            fonteDestinoId:
                "Cartões de crédito não podem ser utilizados em lançamentos de entrada."
        });
    }

    // Parcelamento somente em cartão de crédito.
    if (
        totalParcelas > 1 &&
        fonteDestino.tipo !== "cartao_credito"
    ) {
        erroValidacao({
            totalParcelas:
                "O parcelamento está disponível somente para cartões de crédito."
        });
    }

    return {
        categoria,
        fonteDestino
    };
}

// ======================================================
// RELACIONAMENTOS DEVOLVIDOS NAS CONSULTAS
// ======================================================

const INCLUIR_RELACIONAMENTOS = {
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
// LISTAR LANÇAMENTOS
// GET /api/lancamentos
// ======================================================

export async function listarLancamentos(usuarioId, filtros = {}) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const pagina = validarPagina(filtros.pagina);

    const periodo = montarPeriodo(filtros);

    // Filtros da listagem.
    const where = {
        usuarioId: idUsuario,
        data: periodo.whereData
    };

    const tipo = obterParametro(filtros.tipo, "tipo");

    const categoriaId = obterParametro(
        filtros.categoriaId,
        "categoriaId"
    );

    const fonteDestinoId = obterParametro(
        filtros.fonteDestinoId,
        "fonteDestinoId"
    );

    if (tipo) {
        where.tipo = validarTipo(tipo);
    }

    if (categoriaId) {
        where.categoriaId = validarId(
            categoriaId,
            "categoriaId"
        );
    }

    if (fonteDestinoId) {
        where.fonteDestinoId = validarId(
            fonteDestinoId,
            "fonteDestinoId"
        );
    }

    // Resumo financeiro considera todo o período,
    // independentemente da página e dos demais filtros.
    const whereResumo = {
        usuarioId: idUsuario,
        data: periodo.whereData
    };

    const skip = (pagina - 1) * ITENS_POR_PAGINA;

    // Consultas executadas dentro de uma transação.
    const [lancamentos, total, agrupamentos] =
        await prisma.$transaction([
            prisma.lancamento.findMany({
                where,
                include: INCLUIR_RELACIONAMENTOS,
                orderBy: [
                    { data: "desc" },
                    { id: "desc" }
                ],
                skip,
                take: ITENS_POR_PAGINA
            }),

            prisma.lancamento.count({
                where
            }),

            prisma.lancamento.groupBy({
                by: ["tipo"],
                where: whereResumo,
                _sum: {
                    valor: true
                }
            })
        ]);

    // Calcula os totais sem utilizar float.
    let totalEntradas = 0n;
    let totalSaidas = 0n;

    for (const grupo of agrupamentos) {
        const valor = decimalParaCentavos(grupo._sum.valor);

        if (grupo.tipo === "entrada") {
            totalEntradas = valor;
        }

        if (grupo.tipo === "saida") {
            totalSaidas = valor;
        }
    }

    const totalPaginas = Math.ceil(total / ITENS_POR_PAGINA);

    return {
        lancamentos,

        paginacao: {
            pagina,
            porPagina: ITENS_POR_PAGINA,
            total,
            totalPaginas
        },

        periodo: {
            inicio: periodo.inicio
                ? dataParaTexto(periodo.inicio)
                : null,

            fim: periodo.fim
                ? dataParaTexto(periodo.fim)
                : null
        },

        resumo: {
            totalEntradas: centavosParaDecimal(totalEntradas),
            totalSaidas: centavosParaDecimal(totalSaidas),
            saldo: centavosParaDecimal(totalEntradas - totalSaidas)
        }
    };
}

// ======================================================
// BUSCAR LANÇAMENTO POR ID
// GET /api/lancamentos/:id
// ======================================================

export async function buscarLancamentoPorId(usuarioId, lancamentoId) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const idLancamento = validarId(
        lancamentoId,
        "lancamentoId"
    );

    return prisma.lancamento.findFirst({
        where: {
            id: idLancamento,
            usuarioId: idUsuario
        },
        include: INCLUIR_RELACIONAMENTOS
    });
}

// ======================================================
// CRIAR LANÇAMENTO
// POST /api/lancamentos
// Inclui parcelamento transacional.
// ======================================================

export async function criarLancamento(usuarioId, dados = {}) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const tipo = validarTipo(dados.tipo);

    const descricao = validarDescricao(dados.descricao);

    const valorTotal = validarValor(dados.valor);

    const data = validarData(dados.data);

    const categoriaId = validarId(
        dados.categoriaId,
        "categoriaId"
    );

    const fonteDestinoId = validarId(
        dados.fonteDestinoId,
        "fonteDestinoId"
    );

    const totalParcelas = validarTotalParcelas(
        dados.totalParcelas
    );

    return prisma.$transaction(async (tx) => {
        // Primeiro valida as relações e a compatibilidade.
        await validarRelacionamentos(
            tx,
            idUsuario,
            tipo,
            categoriaId,
            fonteDestinoId,
            totalParcelas
        );

        // Gera um UUID compartilhado pelas parcelas.
        const grupoParcelamento = totalParcelas > 1
            ? randomUUID()
            : null;

        const quantidade = BigInt(totalParcelas);

        // Divide o valor em centavos.
        const valorBase = valorTotal / quantidade;

        const resto = valorTotal % quantidade;

        const lancamentos = [];

        // Uma linha para cada parcela.
        for (let indice = 0; indice < totalParcelas; indice++) {
            // A diferença de arredondamento é adicionada
            // integralmente à primeira parcela.
            const valorParcela = valorBase + (
                indice === 0 ? resto : 0n
            );

            const lancamento = await tx.lancamento.create({
                data: {
                    usuarioId: idUsuario,
                    tipo,
                    descricao,
                    valor: centavosParaDecimal(valorParcela),
                    data,
                    categoriaId,
                    fonteDestinoId,
                    parcelaAtual: indice + 1,
                    totalParcelas,
                    grupoParcelamento
                },

                include: INCLUIR_RELACIONAMENTOS
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
// PUT /api/lancamentos/:id
//
// Atualiza somente o lançamento indicado.
// Para uma compra parcelada, as demais parcelas
// permanecem inalteradas.
// ======================================================

export async function atualizarLancamento(
    usuarioId,
    lancamentoId,
    dados = {}
) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const idLancamento = validarId(
        lancamentoId,
        "lancamentoId"
    );

    // PUT exige todos os campos obrigatórios da movimentação.
    const camposObrigatorios = [
        "tipo",
        "descricao",
        "valor",
        "data",
        "categoriaId",
        "fonteDestinoId"
    ];

    const camposAusentes = {};

    for (const campo of camposObrigatorios) {
        if (
            dados[campo] === undefined ||
            dados[campo] === null ||
            dados[campo] === ""
        ) {
            camposAusentes[campo] = "Este campo é obrigatório.";
        }
    }

    if (Object.keys(camposAusentes).length > 0) {
        throw new AppError(
            400,
            "Dados inválidos.",
            camposAusentes
        );
    }

    const tipo = validarTipo(dados.tipo);

    const descricao = validarDescricao(dados.descricao);

    const valor = validarValor(dados.valor);

    const data = validarData(dados.data);

    const categoriaId = validarId(
        dados.categoriaId,
        "categoriaId"
    );

    const fonteDestinoId = validarId(
        dados.fonteDestinoId,
        "fonteDestinoId"
    );

    return prisma.$transaction(async (tx) => {
        // Busca o lançamento somente dentro do usuário.
        const atual = await tx.lancamento.findFirst({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            }
        });

        if (!atual) {
            return null;
        }

        // Mantém os dados estruturais do parcelamento.
        // O usuário não pode alterar esses campos pelo PUT.
        await validarRelacionamentos(
            tx,
            idUsuario,
            tipo,
            categoriaId,
            fonteDestinoId,
            atual.totalParcelas
        );

        await tx.lancamento.updateMany({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            },

            data: {
                tipo,
                descricao,
                valor: centavosParaDecimal(valor),
                data,
                categoriaId,
                fonteDestinoId
            }
        });

        return tx.lancamento.findFirst({
            where: {
                id: idLancamento,
                usuarioId: idUsuario
            },

            include: INCLUIR_RELACIONAMENTOS
        });
    });
}

// ======================================================
// EXCLUIR LANÇAMENTO
// DELETE /api/lancamentos/:id
//
// Exclui apenas uma parcela por padrão.
// Com todasParcelas = true, exclui o grupo inteiro.
// ======================================================

export async function excluirLancamento(
    usuarioId,
    lancamentoId,
    todasParcelas = false
) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const idLancamento = validarId(
        lancamentoId,
        "lancamentoId"
    );

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

        const excluirGrupo =
            todasParcelas === true &&
            lancamento.grupoParcelamento !== null;

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

        if (resultado.count === 0) {
            return null;
        }

        return {
            quantidadeExcluida: resultado.count,
            todasParcelas: excluirGrupo
        };
    });
}
