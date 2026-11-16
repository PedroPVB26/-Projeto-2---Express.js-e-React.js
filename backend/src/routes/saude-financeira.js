import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Desafio'); // 200
});



export default router;