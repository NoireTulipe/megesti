-- Audit facturation — correctifs

-- 1. pdpLastEventId : curseur pour polling invoice_events
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "pdpLastEventId" TEXT;

-- 2. destinataireAdresse : stockée en base (pas seulement dans le XML)
ALTER TABLE "FactureEmission"
  ADD COLUMN IF NOT EXISTS "destinataireAdresse" TEXT;

-- 3. Contrainte d'unicité sur le numéro de facture par tenant
-- (évite les doublons en cas de race condition sur prochain-numero)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FactureEmission_tenantId_numero_key'
  ) THEN
    ALTER TABLE "FactureEmission"
      ADD CONSTRAINT "FactureEmission_tenantId_numero_key" UNIQUE ("tenantId", "numero");
  END IF;
END $$;
