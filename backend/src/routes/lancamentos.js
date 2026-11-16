import express from 'express';

const router = express.Router();

// GET /api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=
router.get('/', (req, res) => {
    // Lista com filtros e paginação
    res.send('Listagem de lançamentos'); // 200 ou 400
});



router.post('/', (req, res) => {
    // Cria lançamento (com parcelas, se houver)
    res.send('Cadastro de lançamento'); // 201, 400 ou 404
});



router.get('/:id', (req, res) => {
    const { id } = req.params;
    res.send('Listagem de lançamentos'); // 200, 204, 400 ou 404
});



router.put('/:id', (req, res) => {
    const { id } = req.params;
    res.send('Atualizando'); // 200, 204, 400 ou 404
});



router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const todasParcelas = req.query.todasParcelas === 'true';

    res.send('Deletando'); // 200, 204, 400 ou 404
});



export default router;