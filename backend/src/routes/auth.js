const express = require('express');

const router = express.Router();

router.post('/login', (req, res) => {
    // Retorna JWT
    res.send('Login realizado com sucesso'); // 200, 400 ou 401
});



router.post('/cadastro', (req, res) => {
    res.send('Cadastro realizado com sucesso'); // 201, 400 ou 409
});



router.get('/me', (req, res) => {
    res.send('Dados do usuário logado'); // 200 ou 401
});



module.exports = router;