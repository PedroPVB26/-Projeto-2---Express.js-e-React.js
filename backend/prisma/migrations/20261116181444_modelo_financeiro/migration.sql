-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "senha_hash" VARCHAR(100) NOT NULL,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "tipo" VARCHAR(7) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fontes_destinos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "tipo" VARCHAR(14) NOT NULL,
    "dia_fechamento" SMALLINT,
    "dia_vencimento" SMALLINT,
    "limite" DECIMAL(12,2),

    CONSTRAINT "fontes_destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" VARCHAR(7) NOT NULL,
    "descricao" VARCHAR(120) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" DATE NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "fonte_destino_id" INTEGER NOT NULL,
    "parcela_atual" SMALLINT NOT NULL DEFAULT 1,
    "total_parcelas" SMALLINT NOT NULL DEFAULT 1,
    "grupo_parcelamento" UUID,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_usuario_id_nome_tipo_key" ON "categorias"("usuario_id", "nome", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "fontes_destinos_usuario_id_nome_key" ON "fontes_destinos"("usuario_id", "nome");

-- CreateIndex
CREATE INDEX "idx_lancamentos_usuario_data" ON "lancamentos"("usuario_id", "data");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fontes_destinos" ADD CONSTRAINT "fontes_destinos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_fonte_destino_id_fkey" FOREIGN KEY ("fonte_destino_id") REFERENCES "fontes_destinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;





-- ================================================
-- CATEGORIAS
-- ================================================

ALTER TABLE "categorias"
ADD CONSTRAINT "categorias_tipo_check"
CHECK ("tipo" IN ('entrada', 'saida'));


-- ================================================
-- FONTES E DESTINOS
-- ================================================

ALTER TABLE "fontes_destinos"
ADD CONSTRAINT "fontes_destinos_tipo_check"
CHECK ("tipo" IN ('renda', 'conta', 'cartao_credito'));

ALTER TABLE "fontes_destinos"
ADD CONSTRAINT "fontes_destinos_dia_fechamento_check"
CHECK ("dia_fechamento" BETWEEN 1 AND 31);

ALTER TABLE "fontes_destinos"
ADD CONSTRAINT "fontes_destinos_dia_vencimento_check"
CHECK ("dia_vencimento" BETWEEN 1 AND 31);

ALTER TABLE "fontes_destinos"
ADD CONSTRAINT "fontes_destinos_cartao_check"
CHECK (
    "tipo" <> 'cartao_credito'
    OR (
        "dia_fechamento" IS NOT NULL
        AND "dia_vencimento" IS NOT NULL
        AND "limite" IS NOT NULL
    )
);


-- ================================================
-- LANCAMENTOS
-- ================================================

ALTER TABLE "lancamentos"
ADD CONSTRAINT "lancamentos_tipo_check"
CHECK ("tipo" IN ('entrada', 'saida'));

ALTER TABLE "lancamentos"
ADD CONSTRAINT "lancamentos_valor_check"
CHECK ("valor" > 0);

ALTER TABLE "lancamentos"
ADD CONSTRAINT "lancamentos_total_parcelas_check"
CHECK ("total_parcelas" BETWEEN 1 AND 48);

ALTER TABLE "lancamentos"
ADD CONSTRAINT "lancamentos_parcela_atual_check"
CHECK (
    "parcela_atual" BETWEEN 1 AND "total_parcelas"
);