-- Migration: ventes hors session + motifs de vente

-- Table des motifs de vente (liste persistante par tenant)
CREATE TABLE "MotifVente" (
  "id"        TEXT        NOT NULL,
  "tenantId"  TEXT        NOT NULL,
  "libelle"   TEXT        NOT NULL,
  "ordre"     INTEGER     NOT NULL DEFAULT 0,
  "actif"     BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MotifVente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MotifVente_tenantId_idx" ON "MotifVente"("tenantId");

ALTER TABLE "MotifVente"
  ADD CONSTRAINT "MotifVente_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Vente.sessionId devient nullable (hors session)
ALTER TABLE "Vente" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Ajout du FK motifVenteId sur Vente
ALTER TABLE "Vente" ADD COLUMN "motifVenteId" TEXT;

ALTER TABLE "Vente"
  ADD CONSTRAINT "Vente_motifVenteId_fkey"
  FOREIGN KEY ("motifVenteId") REFERENCES "MotifVente"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Vente_motifVenteId_idx" ON "Vente"("motifVenteId");
