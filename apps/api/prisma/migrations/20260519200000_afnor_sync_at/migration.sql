-- Curseur de synchronisation pour l'API AFNOR Flow
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "pdpAfnorSyncAt" TIMESTAMPTZ;
