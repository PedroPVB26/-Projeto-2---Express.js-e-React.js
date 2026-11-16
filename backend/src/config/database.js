import Pool from 'pg-pool';

// mantém um conjunto de conexões disponíveis para serem reutilizadas pelas diferentes rotas da aplicação.

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

export default pool;