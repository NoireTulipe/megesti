-- CreateEnum
CREATE TYPE "PeriodiciteDA" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'TOUS_LES_4_MOIS', 'SEMESTRIEL', 'ANNUEL', 'DATES_FIXES');

-- CreateEnum
CREATE TYPE "StatutPaiementDA" AS ENUM ('PREVU', 'PAYE', 'ANNULE');

-- DropForeignKey
ALTER TABLE "Vente" DROP CONSTRAINT "Vente_sessionId_fkey";

-- AlterTable
ALTER TABLE "ContratAuteur" ADD COLUMN     "datesFixesJSON" JSONB,
ADD COLUMN     "periodicite" "PeriodiciteDA",
ADD COLUMN     "prochainVersement" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaiementDA" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "dateVersement" TIMESTAMP(3) NOT NULL,
    "dateDebutPeriode" TIMESTAMP(3) NOT NULL,
    "dateFinPeriode" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPaiementDA" NOT NULL DEFAULT 'PREVU',
    "modePaiement" "TypePaiementRemise",
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaiementDA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaiementDA_tenantId_idx" ON "PaiementDA"("tenantId");

-- CreateIndex
CREATE INDEX "PaiementDA_tenantId_statut_idx" ON "PaiementDA"("tenantId", "statut");

-- CreateIndex
CREATE INDEX "PaiementDA_contratId_idx" ON "PaiementDA"("contratId");

-- CreateIndex
CREATE INDEX "PaiementDA_auteurId_idx" ON "PaiementDA"("auteurId");

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementDA" ADD CONSTRAINT "PaiementDA_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementDA" ADD CONSTRAINT "PaiementDA_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratAuteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementDA" ADD CONSTRAINT "PaiementDA_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
