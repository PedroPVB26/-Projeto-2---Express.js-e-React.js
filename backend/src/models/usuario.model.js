
import { prisma } from "../config/prisma.js";

import { criarCategoriasPadrao } from "./categoria.model.js";
import { criarFonteDestinoPadrao } from "./fonte-destino.model.js";

// Campos públicos do usuário.
// A senha nunca deve ser retornada pela API.
const USUARIO_PUBLICO_SELECT = {
    id: true,
    nome: true,
    email: true,
    cpf: true,
    criadoEm: true
};

// Normaliza CPF, mantendo somente os dígitos.
function normalizarCpf(cpf) {
    return String(cpf).replace(/\D/g, "");
}

// Normaliza e-mail.
function normalizarEmail(email) {
    return String(email).trim().toLowerCase();
}

// Cria erros de validação que poderão ser tratados pelas rotas.
function erroValidacao(mensagem, campo) {
    const erro = new Error(mensagem);

    erro.code = "VALIDATION_ERROR";
    erro.campo = campo;

    return erro;
}

// Valida os dígitos verificadores do CPF.
export function cpfValido(cpf) {
    const digitos = normalizarCpf(cpf);

    if (
        digitos.length !== 11 ||
        /^(\d)\1{10}$/.test(digitos)
    ) {
        return false;
    }

    const calcularDigito = (tamanho) => {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(digitos[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;

        return resto === 10 ? 0 : resto;
    };

    return (
        calcularDigito(9) === Number(digitos[9]) &&
        calcularDigito(10) === Number(digitos[10])
    );
}

// Busca um usuário pelo e-mail.
export async function buscarCredenciaisPorEmail(email) {
    const emailNormalizado = normalizarEmail(email);

    return prisma.usuario.findUnique({
        where: {
            email: emailNormalizado
        },
        select: {
            ...USUARIO_PUBLICO_SELECT,
            senhaHash: true
        }
    });
}

// Busca os dados públicos de um usuário pelo ID.
export async function buscarUsuarioPorId(id) {
    const usuarioId = Number(id);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        throw erroValidacao("ID de usuário inválido.", "id");
    }

    return prisma.usuario.findUnique({
        where: {
            id: usuarioId
        },
        select: USUARIO_PUBLICO_SELECT
    });
}

// Cadastra um usuário e cria seus dados iniciais.
// Todas as operações são realizadas na mesma transação.
export async function criarUsuario(dados) {
    const nome = String(dados.nome ?? "").trim();
    const email = normalizarEmail(dados.email ?? "");
    const cpf = normalizarCpf(dados.cpf ?? "");
    const senhaHash = dados.senhaHash;

    if (!nome) {
        throw erroValidacao("Nome é obrigatório.", "nome");
    }

    if (nome.length > 120) {
        throw erroValidacao("Nome deve ter até 120 caracteres.", "nome");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw erroValidacao("E-mail inválido.", "email");
    }

    if (email.length > 160) {
        throw erroValidacao("E-mail deve ter até 160 caracteres.", "email");
    }

    if (!cpfValido(cpf)) {
        throw erroValidacao("CPF inválido.", "cpf");
    }

    if (!senhaHash || typeof senhaHash !== "string") {
        throw erroValidacao("Hash da senha é obrigatório.", "senha");
    }

    if (senhaHash.length > 100) {
        throw erroValidacao("Hash da senha excede o limite permitido.", "senha");
    }

    return prisma.$transaction(async (tx) => {
        // 1. Cria o usuário.
        const usuario = await tx.usuario.create({
            data: {
                nome,
                email,
                cpf,
                senhaHash
            },
            select: USUARIO_PUBLICO_SELECT
        });

        // 2. Cria as categorias padrão.
        await criarCategoriasPadrao(usuario.id, tx);

        // 3. Cria uma fonte/destino padrão.
        await criarFonteDestinoPadrao(usuario.id, tx);

        return usuario;
    });
}
