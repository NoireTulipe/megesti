-- CreateEnum
CREATE TYPE "TypeCharge" AS ENUM ('DEPENSE', 'ABONNEMENT', 'PERTE');

-- CreateEnum
CREATE TYPE "StatutCharge" AS ENUM ('PREVU', 'PAYE');

-- CreateEnum
CREATE TYPE "PeriodiciteAbonnement" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE');

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantHT" DECIMAL(10,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "type" "TypeCharge" NOT NULL,
    "statut" "StatutCharge" NOT NULL DEFAULT 'PREVU',
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "periodicite" "PeriodiciteAbonnement",
    "prochaineEcheance" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Charge_tenantId_idx" ON "Charge"("tenantId");

-- CreateIndex
CREATE INDEX "Charge_tenantId_statut_idx" ON "Charge"("tenantId", "statut");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
