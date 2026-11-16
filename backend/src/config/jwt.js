import "dotenv/config";

import jwt from "jsonwebtoken";

function obterSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error(
            "JWT_SECRET não configurado ou possui menos de 32 caracteres."
        );
    }

    return secret;
}

// Gera um JWT para o usuário autenticado.
export function gerarToken(usuarioId) {
    return jwt.sign(
        {},
        obterSecret(),
        {
            subject: String(usuarioId),
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
            algorithm: "HS256"
        }
    );
}

// Verifica a assinatura, o algoritmo e a expiração do JWT.
export function verificarToken(token) {
    return jwt.verify(token, obterSecret(), {
        algorithms: ["HS256"]
    });
}