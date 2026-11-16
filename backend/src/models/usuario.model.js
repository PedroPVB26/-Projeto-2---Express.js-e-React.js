
import { prisma } from "../config/prisma.js";
import { AppError } from "../config/erro.js";

import { criarCategoriasPadrao } from "./categoria.model.js";
import { criarFonteDestinoPadrao } from "./fonte-destino.model.js";

const USUARIO_PUBLICO_SELECT = {
    id: true,
    nome: true,
    email: true,
    criadoEm: true
};

// Remove a máscara do CPF.
function normalizarCpf(cpf) {
    return String(cpf ?? "").replace(/\D/g, "");
}

// Normaliza o e-mail.
function normalizarEmail(email) {
    return String(email ?? "").trim().toLowerCase();
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

// Busca usuário pelo e-mail, incluindo o hash da senha.
// Essa função é de uso interno para autenticação.
export async function buscarCredenciaisPorEmail(email) {
    return prisma.usuario.findUnique({
        where: {
            email: normalizarEmail(email)
        },
        select: {
            id: true,
            nome: true,
            email: true,
            senhaHash: true
        }
    });
}

// Busca os dados públicos do usuário pelo ID.
export async function buscarUsuarioPorId(id) {
    const usuarioId = Number(id);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        throw new AppError(400, "ID de usuário inválido.", {
            id: "Informe um ID válido."
        });
    }

    return prisma.usuario.findUnique({
        where: {
            id: usuarioId
        },
        select: USUARIO_PUBLICO_SELECT
    });
}

// Cadastra usuário e cria seus registros iniciais.
export async function criarUsuario(dados) {
    const nome = String(dados.nome ?? "").trim();
    const email = normalizarEmail(dados.email);
    const cpf = normalizarCpf(dados.cpf);
    const senhaHash = dados.senhaHash;

    const campos = {};

    if (!nome || nome.length > 120) {
        campos.nome = "Informe um nome de até 120 caracteres.";
    }

    if (
        !email ||
        email.length > 160 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        campos.email = "Informe um e-mail válido.";
    }

    if (!cpfValido(cpf)) {
        campos.cpf = "Informe um CPF válido.";
    }

    if (
        typeof senhaHash !== "string" ||
        !senhaHash ||
        senhaHash.length > 100
    ) {
        campos.senha = "Hash da senha inválido.";
    }

    if (Object.keys(campos).length > 0) {
        throw new AppError(400, "Dados inválidos.", campos);
    }

    // Verificação prévia para fornecer mensagens específicas.
    // A garantia definitiva continua sendo a restrição UNIQUE.
    const [emailExistente, cpfExistente] = await Promise.all([
        prisma.usuario.findUnique({
            where: { email },
            select: { id: true }
        }),

        prisma.usuario.findUnique({
            where: { cpf },
            select: { id: true }
        })
    ]);

    const duplicados = {};

    if (emailExistente) {
        duplicados.email = "Este e-mail já está cadastrado.";
    }

    if (cpfExistente) {
        duplicados.cpf = "Este CPF já está cadastrado.";
    }

    if (Object.keys(duplicados).length > 0) {
        throw new AppError(
            409,
            "Usuário já cadastrado.",
            duplicados
        );
    }

    try {
        return await prisma.$transaction(async (tx) => {
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

            // 2. Cria as categorias iniciais.
            await criarCategoriasPadrao(usuario.id, tx);

            // 3. Cria a fonte/destino inicial.
            await criarFonteDestinoPadrao(usuario.id, tx);

            return usuario;
        });
    } catch (erro) {
        // Trata também duplicidades causadas por requisições simultâneas.
        if (erro.code === "P2002") {
            const alvo = Array.isArray(erro.meta?.target)
                ? erro.meta.target.join(" ").toLowerCase()
                : String(erro.meta?.target ?? "").toLowerCase();

            const camposDuplicados = {};

            if (alvo.includes("email")) {
                camposDuplicados.email =
                    "Este e-mail já está cadastrado.";
            } else if (alvo.includes("cpf")) {
                camposDuplicados.cpf =
                    "Este CPF já está cadastrado.";
            } else {
                camposDuplicados.registro =
                    "Já existe um usuário com esses dados.";
            }

            throw new AppError(
                409,
                "Usuário já cadastrado.",
                camposDuplicados
            );
        }

        throw erro;
    }
}