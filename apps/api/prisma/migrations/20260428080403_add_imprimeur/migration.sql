-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "imprimeurId" TEXT;

-- CreateTable
CREATE TABLE "Imprimeur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "lienCommande" TEXT,
    "pointsForts" JSONB,
    "pointsFaibles" JSONB,
    "noteLibre" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Imprimeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactImprimeur" (
    "id" TEXT NOT NULL,
    "imprimeurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,

    CONSTRAINT "ContactImprimeur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Imprimeur_tenantId_idx" ON "Imprimeur"("tenantId");

-- CreateIndex
CREATE INDEX "ContactImprimeur_imprimeurId_idx" ON "ContactImprimeur"("imprimeurId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_imprimeurId_fkey" FOREIGN KEY ("imprimeurId") REFERENCES "Imprimeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imprimeur" ADD CONSTRAINT "Imprimeur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactImprimeur" ADD CONSTRAINT "ContactImprimeur_imprimeurId_fkey" FOREIGN KEY ("imprimeurId") REFERENCES "Imprimeur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
