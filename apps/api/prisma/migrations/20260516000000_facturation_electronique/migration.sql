-- Chantier 2 bis — Facturation électronique (superpdp.tech)
-- Ajout des champs légaux sur Tenant + tables FactureEmission + FactureReception

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "siret"             TEXT,
  ADD COLUMN IF NOT EXISTS "adresseLigne1"     TEXT,
  ADD COLUMN IF NOT EXISTS "adresseLigne2"     TEXT,
  ADD COLUMN IF NOT EXISTS "codePostal"        TEXT,
  ADD COLUMN IF NOT EXISTS "ville"             TEXT,
  ADD COLUMN IF NOT EXISTS "pays"              TEXT DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS "numeroTVA"         TEXT,
  ADD COLUMN IF NOT EXISTS "pdpLastInvoiceId"  TEXT,
  ADD COLUMN IF NOT EXISTS "facturesCredit"    INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "StatutFactureEmission" AS ENUM (
  'BROUILLON', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE'
);

CREATE TABLE "FactureEmission" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "numero"              TEXT NOT NULL,
  "statut"              "StatutFactureEmission" NOT NULL DEFAULT 'BROUILLON',
  "destinataireSiret"   TEXT,
  "destinataireNom"     TEXT,
  "montantHT"           DECIMAL(12,2) NOT NULL,
  "montantTVA"          DECIMAL(12,2) NOT NULL,
  "montantTTC"          DECIMAL(12,2) NOT NULL,
  "format"              TEXT NOT NULL DEFAULT 'ubl',
  "pdpId"               TEXT,
  "dateEmission"        TIMESTAMP(3) NOT NULL,
  "dateEcheance"        TIMESTAMP(3),
  "contenuXml"          TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactureEmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactureReception" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "pdpId"           TEXT NOT NULL,
  "emetteurSiret"   TEXT,
  "emetteurNom"     TEXT,
  "montantTTC"      DECIMAL(12,2) NOT NULL,
  "dateReception"   TIMESTAMP(3) NOT NULL,
  "statut"          TEXT NOT NULL DEFAULT 'RECUE',
  "contenuXml"      TEXT,
  "lu"              BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactureReception_pkey" PRIMARY KEY ("id")
);

-- Index et contraintes

CREATE INDEX "FactureEmission_tenantId_idx"            ON "FactureEmission"("tenantId");
CREATE INDEX "FactureEmission_tenantId_dateEmission_idx" ON "FactureEmission"("tenantId", "dateEmission");
CREATE INDEX "FactureEmission_pdpId_idx"               ON "FactureEmission"("pdpId");

CREATE UNIQUE INDEX "FactureReception_tenantId_pdpId_key" ON "FactureReception"("tenantId", "pdpId");
CREATE INDEX "FactureReception_tenantId_idx"            ON "FactureReception"("tenantId");
CREATE INDEX "FactureReception_tenantId_lu_idx"         ON "FactureReception"("tenantId", "lu");

ALTER TABLE "FactureEmission"  ADD CONSTRAINT "FactureEmission_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactureReception" ADD CONSTRAINT "FactureReception_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
