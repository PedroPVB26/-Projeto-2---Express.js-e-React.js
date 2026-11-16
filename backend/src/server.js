import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './config/prisma.js';

const app = express();
const PORT = 3000;

app.use(express.json());

dotenv.config();

// Rotas
import authRoutes from './routes/auth.js';
import categoriaRoutes from './routes/categoria.js';
import fontesDestinosRoutes from './routes/fontes-destinos.js';
import lancamentosRoutes from './routes/lancamentos.js';
import relatoriosRoutes from './routes/relatorios.js';
import saudeFinanceiraRoutes from './routes/saude-financeira.js';

app.use('/auth', authRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/fontes-destinos', fontesDestinosRoutes);
app.use('/lancamentos', lancamentosRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/saude-financeira', saudeFinanceiraRoutes);

startServer();



async function startServer() {
    try {
        await prisma.$connect();

        const result = await prisma.$queryRaw`SELECT 1 AS conectado`;

        console.log('Prisma conectado ao PostgreSQL!');
        console.log(result);

        app.listen(PORT, () => {
            console.log(`Servidor Express executando na porta ${PORT}`);
        });

    } catch (error) {
        console.error('Erro ao conectar ao PostgreSQL:', error.message);
        process.exit(1);
    }
}