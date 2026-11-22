# Projeto 2 Express.js e React.js

Aplicação full stack de controle financeiro pessoal, construída com Node.js/Express,
PostgreSQL/Prisma e React/Vite.

## Estrutura

- `backend/`: API REST, autenticação JWT, regras de negócio e relatórios.
- `frontend/`: SPA React com rotas protegidas, CRUD, relatórios e gráficos.

## Tecnologias

- Back-end: Express, PostgreSQL, Prisma, JWT, bcrypt, express-rate-limit e CORS.
- Front-end: React, React Router, Axios e Recharts.

## Configuração

1. Instale o PostgreSQL e crie o banco usado pela aplicação.
2. Entre em `backend/`, copie `.env.example` para `.env` e informe `DATABASE_URL`,
   `JWT_SECRET` e `JWT_EXPIRES_IN`.
3. Aplique as migrações:
   `npx prisma migrate deploy`
4. Instale e execute o back-end:
   `npm install`
   `npm run dev`
5. Em outro terminal, entre em `frontend/`, copie `.env.example` para `.env` e execute:
   `npm install`
   `npm run dev`
6. Acesse `http://localhost:5173`.

O back-end utiliza a porta `3000` por padrão.

## Principais rotas

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/auth/cadastro` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário autenticado |
| GET/POST | `/api/categorias` | Listar/criar categorias |
| PUT/DELETE | `/api/categorias/:id` | Editar/excluir categoria |
| GET/POST | `/api/fontes-destinos` | Listar/criar fontes/destinos |
| PUT/DELETE | `/api/fontes-destinos/:id` | Editar/excluir fonte/destino |
| GET/POST | `/api/lancamentos` | Listar/criar lançamentos |
| GET/PUT/DELETE | `/api/lancamentos/:id` | Consultar/editar/excluir lançamento |
| GET | `/api/relatorios/categorias?inicio=&fim=` | Relatório por categoria |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | Relatório por fonte/destino |
| GET | `/api/relatorios/faturas?meses=3` | Previsão de faturas |