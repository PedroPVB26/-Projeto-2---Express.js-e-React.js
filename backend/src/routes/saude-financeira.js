const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Desafio'); // 200
});



module.exports = router;