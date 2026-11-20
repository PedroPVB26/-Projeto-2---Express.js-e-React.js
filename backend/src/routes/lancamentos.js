
import { Router } from "express";

import { AppError } from "../config/erro.js";
import { autenticar } from "../middlewares/autenticar.js";

import {
    listarLancamentos,
    criarLancamento,
    buscarLancamentoPorId,
    atualizarLancamento,
    excluirLancamento
} from "../models/lancamento.model.js";

const router = Router();

// Todas as rotas exigem autenticação JWT.
router.use(autenticar);

// ======================================================
// GET /api/lancamentos
// Listagem com filtros, paginação e totais.
// ======================================================

router.get("/", async (req, res, next) => {
    try {
        const resultado = await listarLancamentos(
            req.usuarioId,
            {
                inicio: req.query.inicio,
                fim: req.query.fim,
                tipo: req.query.tipo,
                categoriaId: req.query.categoriaId,
                fonteDestinoId: req.query.fonteDestinoId,
                pagina: req.query.pagina
            }
        );

        return res.status(200).json(resultado);
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// POST /api/lancamentos
// Cria um lançamento ou um grupo de parcelas.
// ======================================================

router.post("/", async (req, res, next) => {
    try {
        const resultado = await criarLancamento(
            req.usuarioId,
            {
                tipo: req.body?.tipo,
                descricao: req.body?.descricao,
                valor: req.body?.valor,
                data: req.body?.data,
                categoriaId: req.body?.categoriaId,
                fonteDestinoId: req.body?.fonteDestinoId,
                totalParcelas: req.body?.totalParcelas
            }
        );

        return res.status(201).json({
            mensagem: resultado.lancamentos.length > 1
                ? "Compra parcelada registrada com sucesso."
                : "Lançamento registrado com sucesso.",

            grupoParcelamento: resultado.grupoParcelamento,

            quantidadeParcelas: resultado.lancamentos.length,

            lancamentos: resultado.lancamentos
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// GET /api/lancamentos/:id
// Busca um lançamento específico.
// ======================================================

router.get("/:id", async (req, res, next) => {
    try {
        const lancamento = await buscarLancamentoPorId(
            req.usuarioId,
            req.params.id
        );

        if (!lancamento) {
            throw new AppError(
                404,
                "Lançamento não encontrado.",
                {
                    lancamentoId:
                        "O lançamento não existe ou não pertence ao usuário autenticado."
                }
            );
        }

        return res.status(200).json({
            lancamento
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// PUT /api/lancamentos/:id
// Atualiza um lançamento específico.
// ======================================================

router.put("/:id", async (req, res, next) => {
    try {
        const lancamento = await atualizarLancamento(
            req.usuarioId,
            req.params.id,
            {
                tipo: req.body?.tipo,
                descricao: req.body?.descricao,
                valor: req.body?.valor,
                data: req.body?.data,
                categoriaId: req.body?.categoriaId,
                fonteDestinoId: req.body?.fonteDestinoId
            }
        );

        if (!lancamento) {
            throw new AppError(
                404,
                "Lançamento não encontrado.",
                {
                    lancamentoId:
                        "O lançamento não existe ou não pertence ao usuário autenticado."
                }
            );
        }

        return res.status(200).json({
            mensagem: "Lançamento atualizado com sucesso.",
            lancamento
        });
    } catch (erro) {
        return next(erro);
    }
});

// ======================================================
// DELETE /api/lancamentos/:id
// Exclui uma parcela ou todas as parcelas do grupo.
// ======================================================

router.delete("/:id", async (req, res, next) => {
    try {
        const parametroTodasParcelas = req.query.todasParcelas;

        let todasParcelas = false;

        if (parametroTodasParcelas !== undefined) {
            if (
                parametroTodasParcelas !== "true" &&
                parametroTodasParcelas !== "false"
            ) {
                throw new AppError(400, "Dados inválidos.", {
                    todasParcelas:
                        "Informe true ou false."
                });
            }

            todasParcelas = parametroTodasParcelas === "true";
        }

        const resultado = await excluirLancamento(
            req.usuarioId,
            req.params.id,
            todasParcelas
        );

        if (!resultado) {
            throw new AppError(
                404,
                "Lançamento não encontrado.",
                {
                    lancamentoId:
                        "O lançamento não existe ou não pertence ao usuário autenticado."
                }
            );
        }

        // DELETE deve retornar 204 sem corpo.
        return res.status(204).end();
    } catch (erro) {
        return next(erro);
    }
});

export default router;
