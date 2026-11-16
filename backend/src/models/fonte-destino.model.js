
import { prisma } from "../config/prisma.js";

const TIPOS_VALIDOS = ["renda", "conta", "cartao_credito"];

function erroValidacao(mensagem, campo) {
    const erro = new Error(mensagem);

    erro.code = "VALIDATION_ERROR";
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

function normalizarNome(nome) {
    const valor = String(nome ?? "").trim();

    if (!valor) {
        throw erroValidacao("Nome é obrigatório.", "nome");
    }

    if (valor.length > 60) {
        throw erroValidacao(
            "Nome deve possuir no máximo 60 caracteres.",
            "nome"
        );
    }

    return valor;
}

function validarTipo(tipo) {
    const valor = String(tipo ?? "").trim().toLowerCase();

    if (!TIPOS_VALIDOS.includes(valor)) {
        throw erroValidacao(
            "Tipo deve ser renda, conta ou cartao_credito.",
            "tipo"
        );
    }

    return valor;
}

function validarDia(dia, campo) {
    if (dia === null || dia === undefined || dia === "") {
        return null;
    }

    const valor = Number(dia);

    if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
        throw erroValidacao(
            "O dia deve ser um número inteiro entre 1 e 31.",
            campo
        );
    }

    return valor;
}

function normalizarLimite(limite) {
    if (limite === null || limite === undefined || limite === "") {
        return null;
    }

    const valor = String(limite).trim().replace(",", ".");

    if (
        !/^\d{1,10}(\.\d{1,2})?$/.test(valor) ||
        Number(valor) <= 0
    ) {
        throw erroValidacao(
            "O limite deve ser um valor monetário positivo com até duas casas decimais.",
            "limite"
        );
    }

    return valor;
}

// Normaliza todos os campos de uma fonte/destino.
function normalizarDados(dados) {
    const tipo = validarTipo(dados.tipo);

    const resultado = {
        nome: normalizarNome(dados.nome),
        tipo,
        diaFechamento: validarDia(
            dados.diaFechamento,
            "diaFechamento"
        ),
        diaVencimento: validarDia(
            dados.diaVencimento,
            "diaVencimento"
        ),
        limite: normalizarLimite(dados.limite)
    };

    // Cartões precisam obrigatoriamente dos três campos.
    if (tipo === "cartao_credito") {
        if (
            resultado.diaFechamento === null ||
            resultado.diaVencimento === null ||
            resultado.limite === null
        ) {
            throw erroValidacao(
                "Cartões de crédito exigem dia de fechamento, dia de vencimento e limite.",
                "dadosCartao"
            );
        }
    } else {
        // Esses campos não se aplicam a renda e conta.
        resultado.diaFechamento = null;
        resultado.diaVencimento = null;
        resultado.limite = null;
    }

    return resultado;
}

// Cria a fonte/destino padrão durante o cadastro.
export async function criarFonteDestinoPadrao(usuarioId, client = prisma) {
    return client.fonteDestino.create({
        data: {
            usuarioId,
            nome: "Conta corrente",
            tipo: "conta"
        }
    });
}

// Lista fontes/destinos do usuário.
export async function listarFontesDestinos(usuarioId, filtros = {}) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const where = {
        usuarioId: idUsuario
    };

    if (filtros.tipo?.trim()) {
        where.tipo = validarTipo(filtros.tipo);
    }

    return prisma.fonteDestino.findMany({
        where,
        orderBy: {
            nome: "asc"
        }
    });
}

// Busca uma fonte/destino pertencente ao usuário.
export async function buscarFonteDestinoPorId(usuarioId, fonteDestinoId) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(fonteDestinoId, "fonteDestinoId");

    return prisma.fonteDestino.findFirst({
        where: {
            id: idFonteDestino,
            usuarioId: idUsuario
        }
    });
}

// Cria uma fonte/destino.
export async function criarFonteDestino(usuarioId, dados) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const data = normalizarDados(dados);

    return prisma.fonteDestino.create({
        data: {
            usuarioId: idUsuario,
            ...data
        }
    });
}

// Atualiza uma fonte/destino.
export async function atualizarFonteDestino(
    usuarioId,
    fonteDestinoId,
    dados
) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(fonteDestinoId, "fonteDestinoId");

    const atual = await prisma.fonteDestino.findFirst({
        where: {
            id: idFonteDestino,
            usuarioId: idUsuario
        }
    });

    if (!atual) {
        return null;
    }

    const dadosCompletos = {
        nome: dados.nome !== undefined ? dados.nome : atual.nome,
        tipo: dados.tipo !== undefined ? dados.tipo : atual.tipo,
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

    const data = normalizarDados(dadosCompletos);

    // Não permite mudar o tipo quando existem lançamentos vinculados.
    if (data.tipo !== atual.tipo) {
        const quantidadeLancamentos = await prisma.lancamento.count({
            where: {
                fonteDestinoId: idFonteDestino,
                usuarioId: idUsuario
            }
        });

        if (quantidadeLancamentos > 0) {
            throw erroValidacao(
                "Não é possível alterar o tipo de uma fonte/destino que possui lançamentos.",
                "tipo"
            );
        }
    }

    const resultado = await prisma.fonteDestino.updateMany({
        where: {
            id: idFonteDestino,
            usuarioId: idUsuario
        },
        data
    });

    if (resultado.count === 0) {
        return null;
    }

    return buscarFonteDestinoPorId(idUsuario, idFonteDestino);
}

// Exclui uma fonte/destino.
// Não permite excluir registros associados a lançamentos.
export async function excluirFonteDestino(usuarioId, fonteDestinoId) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idFonteDestino = validarId(fonteDestinoId, "fonteDestinoId");

    try {
        return await prisma.$transaction(async (tx) => {
            const fonteDestino = await tx.fonteDestino.findFirst({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            if (!fonteDestino) {
                return null;
            }

            const quantidadeLancamentos = await tx.lancamento.count({
                where: {
                    fonteDestinoId: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            if (quantidadeLancamentos > 0) {
                return {
                    excluida: false,
                    emUso: true,
                    quantidadeLancamentos
                };
            }

            await tx.fonteDestino.deleteMany({
                where: {
                    id: idFonteDestino,
                    usuarioId: idUsuario
                }
            });

            return {
                excluida: true,
                emUso: false
            };
        });
    } catch (erro) {
        if (erro.code === "P2003") {
            return {
                excluida: false,
                emUso: true
            };
        }

        throw erro;
    }
}
