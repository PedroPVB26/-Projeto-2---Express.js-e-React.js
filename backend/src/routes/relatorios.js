const express = require('express');

const router = express.Router();

router.get('/categorias', (req, res) => {
    // RF7
    
    const inicio = req.query.inicio;
    const fim = req.query.fim;
    res.send('Listando'); // 200 ou 400
});



router.post('/fontes-destinos', (req, res) => {
    // RF8
    
    const inicio = req.query.inicio;
    const fim = req.query.fim;
    res.send('Listando'); // 200 ou 400
});



router.get('/faturas', (req, res) => {
    // RF9 (todos os cartões)
    
    const meses = Number(req.query.meses) || 3;
    res.send('Listando'); // 200
});



module.exports = router;