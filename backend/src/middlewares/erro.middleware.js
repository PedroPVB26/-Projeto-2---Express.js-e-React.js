import { AppError } from "../config/erro.js";

// Retorna uma resposta para rotas inexistentes.
export function rotaNaoEncontrada(req, res, next) {
    next(
        new AppError(
            404,
            "Rota não encontrada."
        )
    );
}

// Middleware central de tratamento de erros.
export function tratarErros(erro, req, res, next) {
    if (res.headersSent) {
        return next(erro);
    }

    let statusCode = 500;
    let mensagem = "Erro interno do servidor.";
    let campos = {};

    // ================================================
    // Erros lançados pela aplicação
    // ================================================

    if (erro instanceof AppError) {
        statusCode = erro.statusCode;
        mensagem = erro.message;
        campos = erro.campos ?? {};
    }

    // ================================================
    // Erros antigos dos models
    // Mantém compatibilidade com VALIDATION_ERROR
    // e NOT_FOUND utilizados nos arquivos anteriores.
    // ================================================

    else if (erro.code === "VALIDATION_ERROR") {
        statusCode = 400;
        mensagem = "Dados inválidos.";

        if (erro.campo) {
            campos[erro.campo] = erro.message;
        }
    }

    else if (erro.code === "NOT_FOUND") {
        statusCode = 404;
        mensagem = erro.message;

        if (erro.campo) {
            campos[erro.campo] = erro.message;
        }
    }

    // ================================================
    // Erros de unicidade do Prisma
    // P2002 = UNIQUE constraint violation
    // ================================================

    else if (erro.code === "P2002") {
        statusCode = 409;
        mensagem = "Registro já cadastrado.";

        const alvo = Array.isArray(erro.meta?.target)
            ? erro.meta.target.join(" ").toLowerCase()
            : String(erro.meta?.target ?? "").toLowerCase();

        if (alvo.includes("email")) {
            campos.email = "Este e-mail já está cadastrado.";
        } else if (alvo.includes("cpf")) {
            campos.cpf = "Este CPF já está cadastrado.";
        } else {
            campos.registro = "Já existe um registro com esses dados.";
        }
    }

    // ================================================
    // Erros de chave estrangeira do Prisma
    // ================================================

    else if (erro.code === "P2003") {
        statusCode = 409;
        mensagem = "Não foi possível realizar a operação.";

        campos.relacionamento =
            "O registro está relacionado a outros dados ou não atende às restrições do banco.";
    }

    // Registro obrigatório não encontrado (Prisma P2025).
    else if (erro.code === "P2025") {
        statusCode = 404;
        mensagem = "Registro não encontrado.";
    }

    // Valor maior que o permitido para a coluna (P2000).
    else if (erro.code === "P2000") {
        statusCode = 400;
        mensagem = "Dados inválidos.";

        campos.dados = "Um ou mais valores excedem o tamanho permitido.";
    }

    // ================================================
    // JSON enviado em formato inválido
    // ================================================

    else if (erro.type === "entity.parse.failed") {
        statusCode = 400;
        mensagem = "Dados inválidos.";

        campos.body = "O corpo da requisição contém um JSON inválido.";
    }

    // Corpo da requisição muito grande.
    else if (erro.type === "entity.too.large") {
        statusCode = 413;
        mensagem = "Requisição muito grande.";

        campos.body = "O tamanho do conteúdo enviado excede o limite permitido.";
    }

    // ================================================
    // Erros inesperados
    // ================================================

    else {
        console.error("Erro não tratado:", erro);
    }

    // Todas as respostas de erro possuem a mesma estrutura.
    return res.status(statusCode).json({
        erro: mensagem,
        campos
    });
}
