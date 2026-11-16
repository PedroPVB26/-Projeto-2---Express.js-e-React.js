import { verificarToken } from "../config/jwt.js";
import { AppError } from "../config/erro.js";

export function autenticar(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return next(
            new AppError(401, "Token não informado.", {
                authorization: "Informe o token no cabeçalho Authorization."
            })
        );
    }

    // Espera o formato: Bearer TOKEN
    const correspondencia = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!correspondencia) {
        return next(
            new AppError(401, "Token inválido.", {
                authorization: "Utilize o formato Bearer <token>."
            })
        );
    }

    const token = correspondencia[1];

    try {
        const payload = verificarToken(token);

        const usuarioId = Number(payload.sub);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            throw new Error("Identificador inválido no token.");
        }

        // O ID do usuário vem exclusivamente do JWT.
        req.usuarioId = usuarioId;

        return next();
    } catch {
        return next(
            new AppError(401, "Token inválido ou expirado.", {
                authorization: "Realize o login novamente."
            })
        );
    }
}
