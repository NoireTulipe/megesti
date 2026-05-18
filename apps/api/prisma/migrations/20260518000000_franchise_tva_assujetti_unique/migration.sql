-- Régimes TVA spéciaux pour la facturation électronique
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "franchiseTva"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "assujettUnique" BOOLEAN NOT NULL DEFAULT FALSE;
