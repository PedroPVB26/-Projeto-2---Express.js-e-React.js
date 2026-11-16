const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Listando'); // 200, 201, 400 ou 409
});



router.post('/', (req, res) => {
    res.send('Cadastrando'); // 200, 201, 400 ou 409
});



router.put('/:id', (req, res) => {
    const { id } = req.params;
    res.send('Atualizando'); // 200, 204, 404 ou 409
});



router.delete('/:id', (req, res) => {
    const { id } = req.params;
    res.send('Deletando'); // 200, 204, 404 ou 409
});



module.exports = router;