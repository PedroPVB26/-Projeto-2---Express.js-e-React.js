
import { Router } from "express";

import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";

import { AppError } from "../config/erro.js";
import { gerarToken } from "../config/jwt.js";

import { autenticar } from "../middlewares/autenticar.js";

import {
    cpfValido,
    criarUsuario,
    buscarCredenciaisPorEmail,
    buscarUsuarioPorId
} from "../models/usuario.model.js";

const router = Router();

// ======================================================
// RATE LIMITER DO LOGIN
// Máximo de 10 tentativas por IP a cada 15 minutos.
// ======================================================

const limitarTentativasLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: (req, res, next) => {
        next(
            new AppError(
                429,
                "Muitas tentativas de login.",
                {
                    login: "Aguarde alguns minutos antes de tentar novamente."
                }
            )
        );
    }
});

// ======================================================
// VALIDAÇÃO DO CADASTRO
// ======================================================

function validarDadosCadastro(body) {
    const campos = {};

    const nome = typeof body.nome === "string"
        ? body.nome.trim()
        : "";

    const email = typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const cpf = typeof body.cpf === "string"
        ? body.cpf.replace(/\D/g, "")
        : "";

    const senha = typeof body.senha === "string"
        ? body.senha
        : "";

    const confirmarSenha = typeof body.confirmarSenha === "string"
        ? body.confirmarSenha
        : "";

    // Nome
    if (!nome) {
        campos.nome = "O nome é obrigatório.";
    } else if (nome.length > 120) {
        campos.nome = "O nome deve possuir até 120 caracteres.";
    }

    // E-mail
    if (!email) {
        campos.email = "O e-mail é obrigatório.";
    } else if (
        email.length > 160 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        campos.email = "Informe um e-mail válido.";
    }

    // CPF
    if (!cpf) {
        campos.cpf = "O CPF é obrigatório.";
    } else if (!cpfValido(cpf)) {
        campos.cpf = "Informe um CPF válido.";
    }

    // Senha
    if (!senha) {
        campos.senha = "A senha é obrigatória.";
    } else if (
        senha.length < 8 ||
        !/(?=.*\p{L})(?=.*\d)/u.test(senha)
    ) {
        campos.senha =
            "A senha deve possuir pelo menos 8 caracteres, incluindo letras e números.";
    }

    // Confirmação de senha
    if (!confirmarSenha) {
        campos.confirmarSenha =
            "A confirmação de senha é obrigatória.";
    } else if (senha !== confirmarSenha) {
        campos.confirmarSenha =
            "A confirmação de senha não corresponde à senha informada.";
    }

    if (Object.keys(campos).length > 0) {
        throw new AppError(
            400,
            "Dados inválidos.",
            campos
        );
    }

    return {
        nome,
        email,
        cpf,
        senha
    };
}

// ======================================================
// VALIDAÇÃO DO LOGIN
// ======================================================

function validarDadosLogin(body) {
    const campos = {};

    const email = typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const senha = typeof body.senha === "string"
        ? body.senha
        : "";

    if (!email) {
        campos.email = "O e-mail é obrigatório.";
    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        campos.email = "Informe um e-mail válido.";
    }

    if (!senha) {
        campos.senha = "A senha é obrigatória.";
    }

    if (Object.keys(campos).length > 0) {
        throw new AppError(
            400,
            "Dados inválidos.",
            campos
        );
    }

    return { email, senha };
}

// ======================================================
// POST /api/auth/cadastro
// ======================================================

router.post("/cadastro", async (req, res, next) => {
    try {
        const { nome, email, cpf, senha } =
            validarDadosCadastro(req.body ?? {});

        // Gera hash + salt.
        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await criarUsuario({
            nome,
            email,
            cpf,
            senhaHash
        });

        // Nunca retornar senhaHash.
        return res.status(201).json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            criadoEm: usuario.criadoEm
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// POST /api/auth/login
// ======================================================

router.post(
    "/login",
    limitarTentativasLogin,
    async (req, res, next) => {
        try {
            const { email, senha } =
                validarDadosLogin(req.body ?? {});

            const usuario = await buscarCredenciaisPorEmail(email);

            // A mesma resposta é utilizada para e-mail inexistente
            // e senha incorreta.
            if (!usuario) {
                throw new AppError(
                    401,
                    "Credenciais inválidas.",
                    {
                        credenciais: "E-mail ou senha inválidos."
                    }
                );
            }

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senhaHash
            );

            if (!senhaCorreta) {
                throw new AppError(
                    401,
                    "Credenciais inválidas.",
                    {
                        credenciais: "E-mail ou senha inválidos."
                    }
                );
            }

            const token = gerarToken(usuario.id);

            return res.status(200).json({
                token,
                tipo: "Bearer",
                expiresIn: process.env.JWT_EXPIRES_IN || "1h",

                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                }
            });
        } catch (erro) {
            return next(erro);
        }
    }
);

// ======================================================
// GET /api/auth/me
// ======================================================

router.get("/me", autenticar, async (req, res, next) => {
    try {
        const usuario = await buscarUsuarioPorId(req.usuarioId);

        if (!usuario) {
            throw new AppError(
                401,
                "Sessão inválida.",
                {
                    authorization: "Realize o login novamente."
                }
            );
        }

        return res.status(200).json({
            usuario
        });
    } catch (erro) {
        return next(erro);
    }
});

export default router;
