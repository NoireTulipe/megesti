-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE_DON', 'SORTIE_PERTE', 'SORTIE_VOL', 'SORTIE_DEGRADATION', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "TypeFrais" AS ENUM ('DON', 'PERTE_STOCK', 'DEPLACEMENT', 'REPAS', 'HEBERGEMENT', 'STAND', 'AUTRE');

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockAvant" INTEGER NOT NULL,
    "stockApres" INTEGER NOT NULL,
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frais" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "articleId" TEXT,
    "type" "TypeFrais" NOT NULL,
    "motif" TEXT NOT NULL,
    "montantHT" DECIMAL(10,2),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Frais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MouvementStock_tenantId_idx" ON "MouvementStock"("tenantId");

-- CreateIndex
CREATE INDEX "MouvementStock_articleId_idx" ON "MouvementStock"("articleId");

-- CreateIndex
CREATE INDEX "Frais_tenantId_idx" ON "Frais"("tenantId");

-- CreateIndex
CREATE INDEX "Frais_sessionId_idx" ON "Frais"("sessionId");

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frais" ADD CONSTRAINT "Frais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frais" ADD CONSTRAINT "Frais_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
