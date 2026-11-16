
import { prisma } from "../config/prisma.js";

const TIPOS_VALIDOS = ["entrada", "saida"];

// Erro de validação.
function erroValidacao(mensagem, campo) {
    const erro = new Error(mensagem);

    erro.code = "VALIDATION_ERROR";
    erro.campo = campo;

    return erro;
}

// Converte e valida IDs.
function validarId(id, campo = "id") {
    const valor = Number(id);

    if (!Number.isInteger(valor) || valor <= 0) {
        throw erroValidacao("ID inválido.", campo);
    }

    return valor;
}

// Normaliza e valida o tipo.
function normalizarTipo(tipo) {
    const valor = String(tipo ?? "").trim().toLowerCase();

    if (!TIPOS_VALIDOS.includes(valor)) {
        throw erroValidacao(
            "Tipo deve ser entrada ou saida.",
            "tipo"
        );
    }

    return valor;
}

// Normaliza e valida o nome.
function normalizarNome(nome) {
    const valor = String(nome ?? "").trim();

    if (!valor) {
        throw erroValidacao("Nome da categoria é obrigatório.", "nome");
    }

    if (valor.length > 60) {
        throw erroValidacao(
            "Nome deve possuir no máximo 60 caracteres.",
            "nome"
        );
    }

    return valor;
}

// Categorias iniciais do sistema.
// A função aceita um cliente Prisma opcional para permitir
// sua execução dentro da transação de cadastro do usuário.
export async function criarCategoriasPadrao(usuarioId, client = prisma) {
    const categorias = [
        // Entradas
        { nome: "Salário", tipo: "entrada" },
        { nome: "Freelance", tipo: "entrada" },
        { nome: "Rendimentos", tipo: "entrada" },
        { nome: "Outros", tipo: "entrada" },

        // Saídas
        { nome: "Alimentação", tipo: "saida" },
        { nome: "Moradia", tipo: "saida" },
        { nome: "Saúde", tipo: "saida" },
        { nome: "Mobilidade", tipo: "saida" },
        { nome: "Lazer", tipo: "saida" },
        { nome: "Educação", tipo: "saida" },
        { nome: "Outros", tipo: "saida" }
    ];

    return client.categoria.createMany({
        data: categorias.map((categoria) => ({
            usuarioId,
            ...categoria
        }))
    });
}

// Lista as categorias pertencentes ao usuário.
export async function listarCategorias(usuarioId, filtros = {}) {
    const id = validarId(usuarioId, "usuarioId");

    const where = {
        usuarioId: id
    };

    if (filtros.tipo?.trim()) {
        where.tipo = normalizarTipo(filtros.tipo);
    }

    return prisma.categoria.findMany({
        where,
        orderBy: [
            { tipo: "asc" },
            { nome: "asc" }
        ]
    });
}

// Busca uma categoria pertencente ao usuário.
export async function buscarCategoriaPorId(usuarioId, categoriaId) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idCategoria = validarId(categoriaId, "categoriaId");

    return prisma.categoria.findFirst({
        where: {
            id: idCategoria,
            usuarioId: idUsuario
        }
    });
}

// Cria uma categoria.
export async function criarCategoria(usuarioId, dados) {
    const idUsuario = validarId(usuarioId, "usuarioId");

    const nome = normalizarNome(dados.nome);
    const tipo = normalizarTipo(dados.tipo);

    return prisma.categoria.create({
        data: {
            usuarioId: idUsuario,
            nome,
            tipo
        }
    });
}

// Atualiza uma categoria pertencente ao usuário.
export async function atualizarCategoria(usuarioId, categoriaId, dados) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idCategoria = validarId(categoriaId, "categoriaId");

    const atual = await prisma.categoria.findFirst({
        where: {
            id: idCategoria,
            usuarioId: idUsuario
        },
        include: {
            _count: {
                select: {
                    lancamentos: true
                }
            }
        }
    });

    if (!atual) {
        return null;
    }

    const novoTipo = dados.tipo !== undefined
        ? normalizarTipo(dados.tipo)
        : atual.tipo;

    // Não permite mudar o tipo de uma categoria em uso,
    // pois seus lançamentos poderiam ficar incompatíveis.
    if (
        novoTipo !== atual.tipo &&
        atual._count.lancamentos > 0
    ) {
        throw erroValidacao(
            "Não é possível alterar o tipo de uma categoria que possui lançamentos.",
            "tipo"
        );
    }

    const data = {};

    if (dados.nome !== undefined) {
        data.nome = normalizarNome(dados.nome);
    }

    if (dados.tipo !== undefined) {
        data.tipo = novoTipo;
    }

    if (Object.keys(data).length === 0) {
        throw erroValidacao(
            "Informe pelo menos um campo para atualizar.",
            "dados"
        );
    }

    const resultado = await prisma.categoria.updateMany({
        where: {
            id: idCategoria,
            usuarioId: idUsuario
        },
        data
    });

    if (resultado.count === 0) {
        return null;
    }

    return buscarCategoriaPorId(idUsuario, idCategoria);
}

// Exclui uma categoria.
// Não permite excluir categorias utilizadas em lançamentos.
export async function excluirCategoria(usuarioId, categoriaId) {
    const idUsuario = validarId(usuarioId, "usuarioId");
    const idCategoria = validarId(categoriaId, "categoriaId");

    try {
        return await prisma.$transaction(async (tx) => {
            const categoria = await tx.categoria.findFirst({
                where: {
                    id: idCategoria,
                    usuarioId: idUsuario
                }
            });

            if (!categoria) {
                return null;
            }

            const quantidadeLancamentos = await tx.lancamento.count({
                where: {
                    categoriaId: idCategoria,
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

            await tx.categoria.deleteMany({
                where: {
                    id: idCategoria,
                    usuarioId: idUsuario
                }
            });

            return {
                excluida: true,
                emUso: false
            };
        });
    } catch (erro) {
        // Proteção adicional caso um lançamento seja associado
        // à categoria durante uma operação concorrente.
        if (erro.code === "P2003") {
            return {
                excluida: false,
                emUso: true
            };
        }

        throw erro;
    }
}
