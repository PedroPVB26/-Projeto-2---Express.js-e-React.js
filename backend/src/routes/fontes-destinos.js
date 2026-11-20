
import { Router } from "express";

import { AppError } from "../config/erro.js";
import { autenticar } from "../middlewares/autenticar.js";

import {
    listarFontesDestinos,
    criarFonteDestino,
    atualizarFonteDestino,
    excluirFonteDestino
} from "../models/fonte-destino.model.js";

const router = Router();

// Todas as rotas exigem autenticação.
router.use(autenticar);

// ======================================================
// GET /api/fontes-destinos
// Lista fontes e destinos do usuário autenticado.
// ======================================================

router.get("/", async (req, res, next) => {
    try {
        const fontesDestinos = await listarFontesDestinos(
            req.usuarioId,
            {
                tipo: req.query.tipo
            }
        );

        return res.status(200).json({
            fontesDestinos
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// POST /api/fontes-destinos
// Cadastra uma fonte ou destino.
// ======================================================

router.post("/", async (req, res, next) => {
    try {
        const fonteDestino = await criarFonteDestino(
            req.usuarioId,
            {
                nome: req.body?.nome,
                tipo: req.body?.tipo,
                diaFechamento: req.body?.diaFechamento,
                diaVencimento: req.body?.diaVencimento,
                limite: req.body?.limite
            }
        );

        return res.status(201).json({
            mensagem: "Fonte/destino cadastrado com sucesso.",
            fonteDestino
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// PUT /api/fontes-destinos/:id
// Atualiza uma fonte ou destino.
// ======================================================

router.put("/:id", async (req, res, next) => {
    try {
        const fonteDestino = await atualizarFonteDestino(
            req.usuarioId,
            req.params.id,
            {
                nome: req.body?.nome,
                tipo: req.body?.tipo,
                diaFechamento: req.body?.diaFechamento,
                diaVencimento: req.body?.diaVencimento,
                limite: req.body?.limite
            }
        );

        if (!fonteDestino) {
            throw new AppError(
                404,
                "Fonte/destino não encontrado.",
                {
                    fonteDestinoId: "O registro não existe ou não pertence ao usuário autenticado."
                }
            );
        }

        return res.status(200).json({
            mensagem: "Fonte/destino atualizado com sucesso.",
            fonteDestino
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// DELETE /api/fontes-destinos/:id
// Exclui uma fonte ou destino.
// ======================================================

router.delete("/:id", async (req, res, next) => {
    try {
        const excluida = await excluirFonteDestino(
            req.usuarioId,
            req.params.id
        );

        if (!excluida) {
            throw new AppError(
                404,
                "Fonte/destino não encontrado.",
                {
                    fonteDestinoId: "O registro não existe ou não pertence ao usuário autenticado."
                }
            );
        }

        // 204 No Content não deve retornar JSON.
        return res.status(204).end();
    } catch (erro) {
        return next(erro);
    }
});

export default router;
