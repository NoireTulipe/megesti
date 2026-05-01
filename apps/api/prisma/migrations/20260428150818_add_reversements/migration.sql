-- CreateEnum
CREATE TYPE "StatutReversement" AS ENUM ('EN_ATTENTE', 'ENCAISSE', 'ANNULE');

-- CreateTable
CREATE TABLE "Reversement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pointDeVenteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "montantTTC" DECIMAL(10,2) NOT NULL,
    "nbVentes" INTEGER NOT NULL,
    "statut" "StatutReversement" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCloture" TIMESTAMP(3) NOT NULL,
    "dateEncaissement" TIMESTAMP(3),
    "modePaiement" "TypePaiementRemise",
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reversement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reversement_sessionId_key" ON "Reversement"("sessionId");

-- CreateIndex
CREATE INDEX "Reversement_tenantId_idx" ON "Reversement"("tenantId");

-- CreateIndex
CREATE INDEX "Reversement_tenantId_statut_idx" ON "Reversement"("tenantId", "statut");

-- AddForeignKey
ALTER TABLE "Reversement" ADD CONSTRAINT "Reversement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversement" ADD CONSTRAINT "Reversement_pointDeVenteId_fkey" FOREIGN KEY ("pointDeVenteId") REFERENCES "PointDeVente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversement" ADD CONSTRAINT "Reversement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
