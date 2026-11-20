
import { prisma } from "../config/prisma.js";
import { AppError } from "../config/erro.js";

const TIPOS_VALIDOS = ["renda", "conta", "cartao_credito"];

// ======================================================
// VALIDAÇÕES GERAIS
// ======================================================

function validarId(id, campo = "id") {
    const valor = Number(id);

    if (!Number.isInteger(valor) || valor <= 0) {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Informe um identificador válido."
        });
    }

    return valor;
}

function normalizarNome(nome) {
    if (typeof nome !== "string") {
        throw new AppError(400, "Dados inválidos.", {
            nome: "O nome da fonte/destino é obrigatório."
        });
    }

    const valor = nome.trim();

    if (!valor) {
        throw new AppError(400, "Dados inválidos.", {
            nome: "O nome da fonte/destino é obrigatório."
        });
    }

    if (valor.length > 60) {
        throw new AppError(400, "Dados inválidos.", {
            nome: "O nome deve possuir no máximo 60 caracteres."
        });
    }

    return valor;
}

function normalizarTipo(tipo) {
    if (typeof tipo !== "string") {
        throw new AppError(400, "Dados inválidos.", {
            tipo: "O tipo é obrigatório."
        });
    }

    const valor = tipo.trim().toLowerCase();

    if (!TIPOS_VALIDOS.includes(valor)) {
        throw new AppError(400, "Dados inválidos.", {
            tipo: "O tipo deve ser renda, conta ou cartao_credito."
        });
    }

    return valor;
}

// ======================================================
// VALIDAÇÃO DOS CARTÕES
// ======================================================

function normalizarDia(dia, campo) {
    if (
        dia === undefined ||
        dia === null ||
        dia === ""
    ) {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Este campo é obrigatório para cartões de crédito."
        });
    }

    const valor = Number(dia);

    if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
        throw new AppError(400, "Dados inválidos.", {
            [campo]: "Informe um número inteiro entre 1 e 31."
        });
    }

    return valor;
}

function normalizarLimite(limite) {
    if (
        limite === undefined ||
        limite === null ||
        limite === ""
    ) {
        throw new AppError(400, "Dados inválidos.", {
            limite: "O limite é obrigatório para cartões de crédito."
        });
    }

    const valor = String(limite).trim().replace(",", ".");

    // NUMERIC(12,2): até 10 dígitos inteiros
    // e até 2 casas decimais.
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(valor)) {
        throw new AppError(400, "Dados inválidos.", {
            limite: "Informe um valor monetário válido, com até duas casas decimais."
        });
    }

    if (Number(valor) <= 0) {
        throw new AppError(400, "Dados inválidos.", {
            limite: "O limite deve ser maior que zero."
        });
    }

    // String é aceita diretamente pelo Prisma Decimal.
    return valor;
}

// ======================================================
// NORMALIZAÇÃO COMPLETA DOS DADOS
// ======================================================

function normalizarDados(dados) {
    const nome = normalizarNome(dados.nome);
    const tipo = normalizarTipo(dados.tipo);

    // Apenas cartões de crédito utilizam estes campos.
    if (tipo === "cartao_credito") {
        return {
            nome,
            tipo,
            diaFechamento: normalizarDia(
                dados.diaFechamento,
                "diaFechamento"
            ),
            diaVencimento: normalizarDia(
                dados.diaVencimento,
                "diaVencimento"
            ),
            limite: normalizarLimite(dados.limite)
        };
    }

    return {
        nome,
        tipo,
        diaFechamento: null,
        diaVencimento: null,
        limite: null
    };
}

// ======================================================
// TRATAMENTO DE CONFLITOS DO BANCO
// ======================================================

function tratarErroBanco(erro) {
    if (erro.code === "P2002") {
        throw new AppError(409, "Fonte/destino já cadastrado.", {
            nome: "Já existe uma fonte/destino com este nome para o usuário."
        });
    }

    if (erro.code === "P2003") {
        throw new AppError(409, "Fonte/destino em uso.", {
            fonteDestinoId: "Não é possível realizar a operação porque existem lançamentos associados."
        });
    }

    throw erro;
}

// ======================================================
// CRIAR FONTE/DESTINO PADRÃO
// Executada durante o cadastro do usuário.
// Recebe um client opcional para participar da transação.
// ======================================================

export async function criarFonteDestinoPadrao(
    usuarioId,
    client = prisma
) {
    return client.fonteDestino.create({
        data: {
            usuarioId,
            nome: "Conta corrente",
            tipo: "conta"
        }
    });
}

// ======================================================
// LISTAR FONTES E DESTINOS
// GET /api/fontes-destinos
// ======================================================

export async function listarFontesDestinos(
    usuarioId,
    filtros = {}
) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const where = {
        usuarioId: idUsuario
    };

    // Filtro opcional por tipo.
    // Valores vazios são tratados como ausência de filtro.
    if (
        filtros.tipo !== undefined &&
        filtros.tipo !== null &&
        String(filtros.tipo).trim() !== ""
    ) {
        where.tipo = normalizarTipo(filtros.tipo);
    }

    return prisma.fonteDestino.findMany({
        where,
        orderBy: [
            { tipo: "asc" },
            { nome: "asc" }
        ]
    });
}

// ======================================================
// BUSCAR FONTE/DESTINO POR ID
// Função interna para reutilização em outros models.
// ======================================================

export async function buscarFonteDestinoPorId(
    usuarioId,
    fonteDestinoId
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(
        fonteDestinoId,
        "fonteDestinoId"
    );

    return prisma.fonteDestino.findFirst({
        where: {
            id: idFonteDestino,
            usuarioId: idUsuario
        }
    });
}

// ======================================================
// CRIAR FONTE/DESTINO
// POST /api/fontes-destinos
// ======================================================

export async function criarFonteDestino(usuarioId, dados = {}) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const data = normalizarDados(dados);

    try {
        return await prisma.fonteDestino.create({
            data: {
                usuarioId: idUsuario,
                ...data
            }
        });
    } catch (erro) {
        tratarErroBanco(erro);
    }
}

// ======================================================
// ATUALIZAR FONTE/DESTINO
// PUT /api/fontes-destinos/:id
// ======================================================

export async function atualizarFonteDestino(
    usuarioId,
    fonteDestinoId,
    dados = {}
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(
        fonteDestinoId,
        "fonteDestinoId"
    );

    const camposPermitidos = [
        "nome",
        "tipo",
        "diaFechamento",
        "diaVencimento",
        "limite"
    ];

    const existeCampoParaAtualizar = camposPermitidos.some(
        campo => dados[campo] !== undefined
    );

    if (!existeCampoParaAtualizar) {
        throw new AppError(400, "Dados inválidos.", {
            dados: "Informe ao menos um campo para atualizar."
        });
    }

    try {
        return await prisma.$transaction(async (tx) => {
            // Busca somente registros pertencentes ao usuário.
            const atual = await tx.fonteDestino.findFirst({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            if (!atual) {
                return null;
            }

            // Monta os dados completos, preservando os campos
            // que não foram enviados na requisição.
            const dadosAtualizados = {
                nome: dados.nome !== undefined
                    ? dados.nome
                    : atual.nome,

                tipo: dados.tipo !== undefined
                    ? dados.tipo
                    : atual.tipo,

                diaFechamento: dados.diaFechamento !== undefined
                    ? dados.diaFechamento
                    : atual.diaFechamento,

                diaVencimento: dados.diaVencimento !== undefined
                    ? dados.diaVencimento
                    : atual.diaVencimento,

                limite: dados.limite !== undefined
                    ? dados.limite
                    : atual.limite
            };

            const data = normalizarDados(dadosAtualizados);

            // Regra adicional de integridade:
            // não permite trocar o tipo de um registro em uso.
            if (data.tipo !== atual.tipo) {
                const quantidadeLancamentos =
                    await tx.lancamento.count({
                        where: {
                            fonteDestinoId: idFonteDestino
                        }
                    });

                if (quantidadeLancamentos > 0) {
                    throw new AppError(
                        409,
                        "Fonte/destino em uso.",
                        {
                            tipo: "Não é possível alterar o tipo de uma fonte/destino que possui lançamentos associados."
                        }
                    );
                }
            }

            // Atualiza somente se o registro ainda pertencer
            // ao usuário autenticado.
            const resultado = await tx.fonteDestino.updateMany({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                },
                data
            });

            if (resultado.count === 0) {
                return null;
            }

            return tx.fonteDestino.findFirst({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });
        });
    } catch (erro) {
        tratarErroBanco(erro);
    }
}

// ======================================================
// EXCLUIR FONTE/DESTINO
// DELETE /api/fontes-destinos/:id
// ======================================================

export async function excluirFonteDestino(
    usuarioId,
    fonteDestinoId
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(
        fonteDestinoId,
        "fonteDestinoId"
    );

    try {
        return await prisma.$transaction(async (tx) => {
            // Verifica se existe e pertence ao usuário.
            const fonteDestino = await tx.fonteDestino.findFirst({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            if (!fonteDestino) {
                return null;
            }

            // Verifica se há lançamentos associados.
            // Não filtra por usuarioId aqui, pois precisamos
            // identificar qualquer referência à chave estrangeira.
            const quantidadeLancamentos = await tx.lancamento.count({
                where: {
                    fonteDestinoId: idFonteDestino
                }
            });

            if (quantidadeLancamentos > 0) {
                throw new AppError(
                    409,
                    "Fonte/destino em uso.",
                    {
                        fonteDestinoId: "Não é possível excluir uma fonte/destino que possui lançamentos associados."
                    }
                );
            }

            const resultado = await tx.fonteDestino.deleteMany({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            return resultado.count > 0;
        });
    } catch (erro) {
        tratarErroBanco(erro);
    }
}
