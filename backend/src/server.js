const express = require('express');

// Rotas
const authRoutes = require('./routes/auth');
const categoriaRoutes = require('./routes/categoria');
const fontesDestinosRoutes = require('./routes/fontes-destinos');
const lancamentosRoutes = require('./routes/lancamentos');
const relatoriosRoutes = require('./routes/relatorios');
const saudeFinanceiraRoutes = require('./routes/saude-financeira');

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/fontes-destinos', fontesDestinosRoutes);
app.use('/lancamentos', lancamentosRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/saude-financeira', saudeFinanceiraRoutes);

app.listen(3000, () => {
  console.log('Servidor Express executando na porta 3000');
});