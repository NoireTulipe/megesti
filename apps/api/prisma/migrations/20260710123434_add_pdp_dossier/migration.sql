-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PdpStatut" ADD VALUE 'DOSSIER_SOUMIS';
ALTER TYPE "PdpStatut" ADD VALUE 'KYB_EN_COURS';

-- CreateTable
CREATE TABLE "PdpDossier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "representantPrenom" TEXT NOT NULL,
    "representantNom" TEXT NOT NULL,
    "representantEmail" TEXT NOT NULL,
    "cniRectoPath" TEXT,
    "cniRectoMime" TEXT,
    "cniVersoPath" TEXT,
    "cniVersoMime" TEXT,
    "cniPurgeeAt" TIMESTAMP(3),
    "consentementAt" TIMESTAMP(3) NOT NULL,
    "soumisAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdpDossier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdpDossier_tenantId_key" ON "PdpDossier"("tenantId");

-- AddForeignKey
ALTER TABLE "PdpDossier" ADD CONSTRAINT "PdpDossier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
