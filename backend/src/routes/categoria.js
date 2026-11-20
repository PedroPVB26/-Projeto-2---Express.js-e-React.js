
import { Router } from "express";

import { AppError } from "../config/erro.js";
import { autenticar } from "../middlewares/autenticar.js";

import {
    listarCategorias,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria
} from "../models/categoria.model.js";

const router = Router();

// Todas as rotas exigem autenticação.
router.use(autenticar);

// GET /api/categorias
router.get("/", async (req, res, next) => {
    try {
        const categorias = await listarCategorias(
            req.usuarioId,
            { tipo: req.query.tipo }
        );

        return res.status(200).json({ categorias });
    } catch (erro) {
        return next(erro);
    }
});

// POST /api/categorias
router.post("/", async (req, res, next) => {
    try {
        const categoria = await criarCategoria(
            req.usuarioId,
            {
                nome: req.body?.nome,
                tipo: req.body?.tipo
            }
        );

        return res.status(201).json({
            mensagem: "Categoria criada com sucesso.",
            categoria
        });
    } catch (erro) {
        return next(erro);
    }
});

// PUT /api/categorias/:id
router.put("/:id", async (req, res, next) => {
    try {
        const categoria = await atualizarCategoria(
            req.usuarioId,
            req.params.id,
            {
                nome: req.body?.nome,
                tipo: req.body?.tipo
            }
        );

        if (!categoria) {
            throw new AppError(404, "Categoria não encontrada.", {
                categoriaId: "A categoria não existe ou não pertence ao usuário autenticado."
            });
        }

        return res.status(200).json({
            mensagem: "Categoria atualizada com sucesso.",
            categoria
        });
    } catch (erro) {
        return next(erro);
    }
});

// DELETE /api/categorias/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const excluida = await excluirCategoria(
            req.usuarioId,
            req.params.id
        );

        if (!excluida) {
            throw new AppError(404, "Categoria não encontrada.", {
                categoriaId: "A categoria não existe ou não pertence ao usuário autenticado."
            });
        }

        return res.status(204).end();
    } catch (erro) {
        return next(erro);
    }
});

export default router;
