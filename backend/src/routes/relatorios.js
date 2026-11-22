
import { Router } from "express";

import { AppError } from "../config/erro.js";
import { autenticar } from "../middlewares/autenticar.js";

import {
    relatorioPorCategoria,
    relatorioPorFonteDestino,
    relatorioFaturas
} from "../models/relatorio.model.js";

const router = Router();

// Todos os relatórios exigem autenticação.
router.use(autenticar);

// ======================================================
// RF7 — RELATÓRIO POR CATEGORIA
// GET /api/relatorios/categorias?inicio=&fim=
// ======================================================

router.get("/categorias", async (req, res, next) => {
    try {
        const resultado = await relatorioPorCategoria(
            req.usuarioId,
            {
                inicio: req.query.inicio,
                fim: req.query.fim
            }
        );

        return res.status(200).json(resultado);
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// RF8 — RELATÓRIO POR FONTE/DESTINO
// GET /api/relatorios/fontes-destinos?inicio=&fim=
// ======================================================

router.get("/fontes-destinos", async (req, res, next) => {
    try {
        const resultado = await relatorioPorFonteDestino(
            req.usuarioId,
            {
                inicio: req.query.inicio,
                fim: req.query.fim
            }
        );

        return res.status(200).json(resultado);
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// RF9 — PREVISÃO DE FATURAS
// GET /api/relatorios/faturas?meses=3
// ======================================================

router.get("/faturas", async (req, res, next) => {
    try {
        const resultado = await relatorioFaturas(
            req.usuarioId,
            {
                meses: req.query.meses
            }
        );

        return res.status(200).json(resultado);
    } catch (erro) {
        return next(erro);
    }
});

export default router;
