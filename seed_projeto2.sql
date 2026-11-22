-- ============================================================
-- SEED DEMONSTRATIVO - PROJETO 2 / CONTROLE FINANCEIRO
-- PostgreSQL 17 + schema atual do Prisma
--
-- Usuarios de demonstracao:
--   joao.demo@exemplo.com  / Demo1234
--   marina.demo@exemplo.com / Demo1234
--
-- O script e reexecutavel para essas duas contas: antes de
-- recria-las, remove somente os lancamentos e usuarios com os
-- e-mails demonstrativos acima. Nao apaga os demais usuarios.
--
-- Periodo dos lancamentos: setembro, outubro e novembro/2026.
-- Inclui entradas, despesas em contas, compras em cartao e
-- tres grupos de compras parceladas para demonstrar faturas.
-- ============================================================

BEGIN;

-- Remove primeiro os lancamentos das contas demonstrativas,
-- respeitando as FKs RESTRICT de categoria e fonte/destino.
DELETE FROM public.lancamentos
WHERE usuario_id IN (
    SELECT id
    FROM public.usuarios
    WHERE email IN (
        'joao.demo@exemplo.com',
        'marina.demo@exemplo.com'
    )
);

-- A exclusao dos usuarios remove suas categorias e fontes/destinos
-- por ON DELETE CASCADE.
DELETE FROM public.usuarios
WHERE email IN (
    'joao.demo@exemplo.com',
    'marina.demo@exemplo.com'
);

DO $seed$
DECLARE
    v_joao_id INTEGER;
    v_marina_id INTEGER;
BEGIN
    -- --------------------------------------------------------
    -- 1. USUARIOS
    -- Senha dos dois usuarios: Demo1234
    -- Hash bcrypt (cost 10); nao e senha em texto puro.
    -- --------------------------------------------------------

    INSERT INTO public.usuarios (nome, email, cpf, senha_hash)
    VALUES (
        'Joao Demonstracao',
        'joao.demo@exemplo.com',
        '52998224725',
        '$2b$10$DwR7K6d3Y.pkX0MMvId1t.ogLKZs12UuSpsxd3ahNfn6ynS2Rz69G'
    )
    RETURNING id INTO v_joao_id;

    INSERT INTO public.usuarios (nome, email, cpf, senha_hash)
    VALUES (
        'Marina Demonstracao',
        'marina.demo@exemplo.com',
        '11144477735',
        '$2b$10$IacNXkBmnE9qF3OZNJ5tuudXh8/Fz7Y24HQPwkofI1C0MLS7nEXsW'
    )
    RETURNING id INTO v_marina_id;

    -- --------------------------------------------------------
    -- 2. CATEGORIAS DO JOAO
    -- Inclui categorias padrao e algumas adicionais.
    -- --------------------------------------------------------

    INSERT INTO public.categorias (usuario_id, nome, tipo)
    VALUES
        (v_joao_id, 'Salario',       'entrada'),
        (v_joao_id, 'Freelance',     'entrada'),
        (v_joao_id, 'Rendimentos',   'entrada'),
        (v_joao_id, 'Outros',        'entrada'),
        (v_joao_id, 'Alimentacao',   'saida'),
        (v_joao_id, 'Moradia',       'saida'),
        (v_joao_id, 'Saude',         'saida'),
        (v_joao_id, 'Mobilidade',    'saida'),
        (v_joao_id, 'Lazer',         'saida'),
        (v_joao_id, 'Educacao',      'saida'),
        (v_joao_id, 'Compras',       'saida'),
        (v_joao_id, 'Assinaturas',   'saida'),
        (v_joao_id, 'Viagens',       'saida'),
        (v_joao_id, 'Outros',        'saida');

    -- --------------------------------------------------------
    -- 3. FONTES E DESTINOS DO JOAO
    -- --------------------------------------------------------

    INSERT INTO public.fontes_destinos (
        usuario_id, nome, tipo,
        dia_fechamento, dia_vencimento, limite
    )
    VALUES
        (v_joao_id, 'Salario principal', 'renda', NULL, NULL, NULL),
        (v_joao_id, 'Freelance',          'renda', NULL, NULL, NULL),
        (v_joao_id, 'Conta corrente',     'conta', NULL, NULL, NULL),
        (v_joao_id, 'Poupanca',           'conta', NULL, NULL, NULL),
        (v_joao_id, 'Dinheiro',           'conta', NULL, NULL, NULL),
        (v_joao_id, 'Nubank',             'cartao_credito', 3, 10, 8000.00),
        (v_joao_id, 'Visa Platinum',      'cartao_credito', 25, 5, 12000.00);

    -- --------------------------------------------------------
    -- 4. CATEGORIAS DA MARINA
    -- --------------------------------------------------------

    INSERT INTO public.categorias (usuario_id, nome, tipo)
    VALUES
        (v_marina_id, 'Salario',       'entrada'),
        (v_marina_id, 'Freelance',     'entrada'),
        (v_marina_id, 'Rendimentos',   'entrada'),
        (v_marina_id, 'Outros',        'entrada'),
        (v_marina_id, 'Alimentacao',   'saida'),
        (v_marina_id, 'Moradia',       'saida'),
        (v_marina_id, 'Saude',         'saida'),
        (v_marina_id, 'Mobilidade',    'saida'),
        (v_marina_id, 'Lazer',         'saida'),
        (v_marina_id, 'Educacao',      'saida'),
        (v_marina_id, 'Compras',       'saida'),
        (v_marina_id, 'Assinaturas',   'saida'),
        (v_marina_id, 'Viagens',       'saida'),
        (v_marina_id, 'Outros',        'saida');

    -- --------------------------------------------------------
    -- 5. FONTES E DESTINOS DA MARINA
    -- --------------------------------------------------------

    INSERT INTO public.fontes_destinos (
        usuario_id, nome, tipo,
        dia_fechamento, dia_vencimento, limite
    )
    VALUES
        (v_marina_id, 'Salario',        'renda', NULL, NULL, NULL),
        (v_marina_id, 'Freelance',      'renda', NULL, NULL, NULL),
        (v_marina_id, 'Conta corrente', 'conta', NULL, NULL, NULL),
        (v_marina_id, 'Dinheiro',       'conta', NULL, NULL, NULL),
        (v_marina_id, 'Cartao Inter',   'cartao_credito', 15, 22, 6000.00);

    -- --------------------------------------------------------
    -- 6. LANCAMENTOS DO JOAO
    -- Tres meses: setembro, outubro e novembro de 2026.
    -- O JOIN encontra categoria e fonte/destino pelos nomes
    -- dentro do proprio usuario; nenhum ID fixo e presumido.
    -- --------------------------------------------------------

    WITH dados (
        tipo, descricao, valor, data_lancamento,
        categoria_nome, fonte_nome,
        parcela_atual, total_parcelas, grupo_parcelamento
    ) AS (
        VALUES
        -- SETEMBRO/2026: entradas
        ('entrada', 'Salario setembro',       5200.00::numeric(12,2), DATE '2026-09-05', 'Salario',     'Salario principal', 1, 1, NULL::uuid),
        ('entrada', 'Projeto freelance',       650.00,                 DATE '2026-09-18', 'Freelance',   'Freelance',         1, 1, NULL::uuid),

        -- SETEMBRO/2026: saidas
        ('saida', 'Aluguel setembro',         1400.00, DATE '2026-09-06', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado',               430.00, DATE '2026-09-07', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Farmacia',                    86.00, DATE '2026-09-10', 'Saude',       'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Combustivel',                170.00, DATE '2026-09-14', 'Mobilidade',  'Dinheiro',       1, 1, NULL::uuid),
        ('saida', 'Cinema',                      80.00, DATE '2026-09-18', 'Lazer',       'Nubank',         1, 1, NULL::uuid),
        ('saida', 'Restaurante',                120.00, DATE '2026-09-20', 'Alimentacao', 'Visa Platinum', 1, 1, NULL::uuid),
        ('saida', 'Compra online',              240.00, DATE '2026-09-23', 'Compras',     'Visa Platinum', 1, 1, NULL::uuid),
        ('saida', 'Aplicativo de transporte',    42.00, DATE '2026-09-28', 'Mobilidade',  'Nubank',         1, 1, NULL::uuid),
        ('saida', 'Streaming',                   39.90, DATE '2026-09-30', 'Assinaturas', 'Nubank',         1, 1, NULL::uuid),

        -- OUTUBRO/2026: entradas
        ('entrada', 'Salario outubro',         5200.00, DATE '2026-10-05', 'Salario',     'Salario principal', 1, 1, NULL::uuid),
        ('entrada', 'Consultoria freelance',    900.00, DATE '2026-10-16', 'Freelance',   'Freelance',         1, 1, NULL::uuid),

        -- OUTUBRO/2026: saidas
        ('saida', 'Aluguel outubro',           1400.00, DATE '2026-10-04', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado outubro',       465.00, DATE '2026-10-05', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Consulta medica',            125.00, DATE '2026-10-09', 'Saude',       'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Roupa',                      280.00, DATE '2026-10-14', 'Compras',     'Visa Platinum', 1, 1, NULL::uuid),
        ('saida', 'Jantar',                      95.00, DATE '2026-10-18', 'Alimentacao', 'Nubank',         1, 1, NULL::uuid),
        ('saida', 'Compras para casa',          390.00, DATE '2026-10-26', 'Compras',     'Nubank',         1, 1, NULL::uuid),
        ('saida', 'Internet',                   109.00, DATE '2026-10-28', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Livro',                       89.00, DATE '2026-10-29', 'Educacao',    'Visa Platinum', 1, 1, NULL::uuid),

        -- NOVEMBRO/2026: entradas
        ('entrada', 'Salario novembro',        5400.00, DATE '2026-11-05', 'Salario',     'Salario principal', 1, 1, NULL::uuid),
        ('entrada', 'Projeto freelance novembro',750.00,DATE '2026-11-14', 'Freelance',   'Freelance',         1, 1, NULL::uuid),
        ('entrada', 'Rendimento da poupanca',    48.00, DATE '2026-11-12', 'Rendimentos', 'Poupanca',          1, 1, NULL::uuid),

        -- NOVEMBRO/2026: saidas
        ('saida', 'Aluguel novembro',          1400.00, DATE '2026-11-02', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado novembro',       510.00, DATE '2026-11-04', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Farmacia novembro',            75.00, DATE '2026-11-06', 'Saude',       'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Combustivel novembro',        180.00, DATE '2026-11-12', 'Mobilidade',  'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Restaurante novembro',        145.00, DATE '2026-11-15', 'Alimentacao', 'Nubank',         1, 1, NULL::uuid),
        ('saida', 'Assinatura de software',       59.90, DATE '2026-11-08', 'Assinaturas', 'Nubank',         1, 1, NULL::uuid),

        -- COMPRA PARCELADA NUBANK: R$ 100,00 em 3 vezes
        ('saida', 'Notebook',       33.34, DATE '2026-11-20', 'Compras', 'Nubank', 1, 3, '11111111-1111-4111-8111-111111111111'::uuid),
        ('saida', 'Notebook',       33.33, DATE '2026-11-20', 'Compras', 'Nubank', 2, 3, '11111111-1111-4111-8111-111111111111'::uuid),
        ('saida', 'Notebook',       33.33, DATE '2026-11-20', 'Compras', 'Nubank', 3, 3, '11111111-1111-4111-8111-111111111111'::uuid),

        -- COMPRA PARCELADA VISA: R$ 1.200,00 em 4 vezes
        ('saida', 'Sofa',          300.00, DATE '2026-11-20', 'Compras', 'Visa Platinum', 1, 4, '22222222-2222-4222-8222-222222222222'::uuid),
        ('saida', 'Sofa',          300.00, DATE '2026-11-20', 'Compras', 'Visa Platinum', 2, 4, '22222222-2222-4222-8222-222222222222'::uuid),
        ('saida', 'Sofa',          300.00, DATE '2026-11-20', 'Compras', 'Visa Platinum', 3, 4, '22222222-2222-4222-8222-222222222222'::uuid),
        ('saida', 'Sofa',          300.00, DATE '2026-11-20', 'Compras', 'Visa Platinum', 4, 4, '22222222-2222-4222-8222-222222222222'::uuid)
    )
    INSERT INTO public.lancamentos (
        usuario_id, tipo, descricao, valor, data,
        categoria_id, fonte_destino_id,
        parcela_atual, total_parcelas, grupo_parcelamento
    )
    SELECT
        v_joao_id,
        d.tipo,
        d.descricao,
        d.valor,
        d.data_lancamento,
        c.id,
        f.id,
        d.parcela_atual,
        d.total_parcelas,
        d.grupo_parcelamento
    FROM dados d
    JOIN public.categorias c
      ON c.usuario_id = v_joao_id
     AND c.nome = d.categoria_nome
     AND c.tipo = d.tipo
    JOIN public.fontes_destinos f
      ON f.usuario_id = v_joao_id
     AND f.nome = d.fonte_nome;

    -- --------------------------------------------------------
    -- 7. LANCAMENTOS DA MARINA
    -- Tambem cobre setembro, outubro e novembro/2026.
    -- --------------------------------------------------------

    WITH dados (
        tipo, descricao, valor, data_lancamento,
        categoria_nome, fonte_nome,
        parcela_atual, total_parcelas, grupo_parcelamento
    ) AS (
        VALUES
        -- SETEMBRO/2026: entradas
        ('entrada', 'Salario setembro',       4200.00::numeric(12,2), DATE '2026-09-03', 'Salario',   'Salario',   1, 1, NULL::uuid),
        ('entrada', 'Freelance setembro',      320.00,                 DATE '2026-09-15', 'Freelance', 'Freelance', 1, 1, NULL::uuid),

        -- SETEMBRO/2026: saidas
        ('saida', 'Aluguel setembro',         1100.00, DATE '2026-09-05', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado',               340.00, DATE '2026-09-08', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Farmacia',                    65.00, DATE '2026-09-12', 'Saude',       'Dinheiro',       1, 1, NULL::uuid),
        ('saida', 'Compra online',              210.00, DATE '2026-09-16', 'Compras',     'Cartao Inter',   1, 1, NULL::uuid),

        -- OUTUBRO/2026: entradas
        ('entrada', 'Salario outubro',         4200.00, DATE '2026-10-03', 'Salario',   'Salario',   1, 1, NULL::uuid),
        ('entrada', 'Freelance outubro',         450.00, DATE '2026-10-15', 'Freelance', 'Freelance', 1, 1, NULL::uuid),

        -- OUTUBRO/2026: saidas
        ('saida', 'Aluguel outubro',           1100.00, DATE '2026-10-04', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado outubro',       380.00, DATE '2026-10-09', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Combustivel',                150.00, DATE '2026-10-14', 'Mobilidade',  'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Compra no fechamento',       125.00, DATE '2026-10-15', 'Compras',     'Cartao Inter',   1, 1, NULL::uuid),
        ('saida', 'Eletronico',                 240.00, DATE '2026-10-28', 'Compras',     'Cartao Inter',   1, 1, NULL::uuid),
        ('saida', 'Streaming',                   45.00, DATE '2026-10-14', 'Assinaturas', 'Conta corrente', 1, 1, NULL::uuid),

        -- NOVEMBRO/2026: entradas
        ('entrada', 'Salario novembro',        4400.00, DATE '2026-11-03', 'Salario',   'Salario',   1, 1, NULL::uuid),
        ('entrada', 'Freelance novembro',        600.00, DATE '2026-11-16', 'Freelance', 'Freelance', 1, 1, NULL::uuid),

        -- NOVEMBRO/2026: saidas
        ('saida', 'Aluguel novembro',          1100.00, DATE '2026-11-02', 'Moradia',     'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Supermercado novembro',       420.00, DATE '2026-11-09', 'Alimentacao', 'Conta corrente', 1, 1, NULL::uuid),
        ('saida', 'Passagem aerea',              600.00, DATE '2026-11-16', 'Viagens',     'Cartao Inter',   1, 1, NULL::uuid),

        -- COMPRA PARCELADA INTER: R$ 450,00 em 2 vezes
        ('saida', 'Curso',        225.00, DATE '2026-11-18', 'Educacao', 'Cartao Inter', 1, 2, '33333333-3333-4333-8333-333333333333'::uuid),
        ('saida', 'Curso',        225.00, DATE '2026-11-18', 'Educacao', 'Cartao Inter', 2, 2, '33333333-3333-4333-8333-333333333333'::uuid)
    )
    INSERT INTO public.lancamentos (
        usuario_id, tipo, descricao, valor, data,
        categoria_id, fonte_destino_id,
        parcela_atual, total_parcelas, grupo_parcelamento
    )
    SELECT
        v_marina_id,
        d.tipo,
        d.descricao,
        d.valor,
        d.data_lancamento,
        c.id,
        f.id,
        d.parcela_atual,
        d.total_parcelas,
        d.grupo_parcelamento
    FROM dados d
    JOIN public.categorias c
      ON c.usuario_id = v_marina_id
     AND c.nome = d.categoria_nome
     AND c.tipo = d.tipo
    JOIN public.fontes_destinos f
      ON f.usuario_id = v_marina_id
     AND f.nome = d.fonte_nome;

    RAISE NOTICE 'Seed concluido. Joao ID: %, Marina ID: %',
        v_joao_id, v_marina_id;
END;
$seed$;

COMMIT;

-- ------------------------------------------------------------
-- CONFERENCIA RAPIDA
-- Deve retornar os dois usuarios e a quantidade de registros.
-- ------------------------------------------------------------
SELECT
    u.id,
    u.nome,
    u.email,
    (SELECT COUNT(*) FROM public.categorias c WHERE c.usuario_id = u.id) AS categorias,
    (SELECT COUNT(*) FROM public.fontes_destinos f WHERE f.usuario_id = u.id) AS fontes_destinos,
    (SELECT COUNT(*) FROM public.lancamentos l WHERE l.usuario_id = u.id) AS lancamentos,
    (SELECT COUNT(DISTINCT l.data) FROM public.lancamentos l WHERE l.usuario_id = u.id) AS dias_com_lancamentos
FROM public.usuarios u
WHERE u.email IN (
    'joao.demo@exemplo.com',
    'marina.demo@exemplo.com'
)
ORDER BY u.id;

-- Conferir os grupos de parcelamento:
SELECT
    u.email,
    l.descricao,
    l.grupo_parcelamento,
    COUNT(*) AS quantidade_parcelas,
    SUM(l.valor) AS valor_total,
    MIN(l.parcela_atual) AS primeira_parcela,
    MAX(l.parcela_atual) AS ultima_parcela
FROM public.lancamentos l
JOIN public.usuarios u ON u.id = l.usuario_id
WHERE l.grupo_parcelamento IS NOT NULL
  AND u.email IN (
      'joao.demo@exemplo.com',
      'marina.demo@exemplo.com'
  )
GROUP BY u.email, l.descricao, l.grupo_parcelamento
ORDER BY u.email, l.descricao;
