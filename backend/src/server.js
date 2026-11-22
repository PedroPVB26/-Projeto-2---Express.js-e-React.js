
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { prisma } from './config/prisma.js';

// Rotas
import authRoutes from './routes/auth.js';
import categoriaRoutes from './routes/categoria.js';
import fontesDestinosRoutes from './routes/fontes-destinos.js';
import lancamentosRoutes from './routes/lancamentos.js';
import relatoriosRoutes from './routes/relatorios.js';

import {rotaNaoEncontrada, tratarErros} from './middlewares/erro.middleware.js';



const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());

// ======================================================
// ROTAS

app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// ======================================================
// TRATAMENTO DE ROTAS E ERROS

// Deve ficar depois de todas as rotas.
app.use(rotaNaoEncontrada);

// Deve ser o último middleware.
app.use(tratarErros);


async function startServer() {
    try {
        // Estabelece a conexão com o PostgreSQL.
        await prisma.$connect();

        // Testa a comunicação com o banco.
        const result = await prisma.$queryRaw`
            SELECT 1 AS conectado
        `;

        console.log('Prisma conectado ao PostgreSQL!');
        console.log(result);

        // Inicia o servidor somente após confirmar a conexão.
        app.listen(PORT, () => {
            console.log(`Servidor Express executando na porta ${PORT}`);
        });

    } catch (error) {
        console.error(
            'Erro ao iniciar o servidor:',
            error.message
        );

        await prisma.$disconnect().catch(() => {});

        process.exit(1);
    }
}

startServer();