-- Migration: ajout CategorieCharge (PCG 60/61-62/63/65/67)

CREATE TYPE "CategorieCharge" AS ENUM (
  'ACHATS',
  'SERVICES',
  'IMPOTS_TAXES',
  'AUTRES_CHARGES',
  'CHARGES_EXCEPT'
);

ALTER TABLE "Charge" ADD COLUMN "categorie" "CategorieCharge" NOT NULL DEFAULT 'SERVICES';

-- Backfill par type :
--   DEPENSE  → ACHATS (60x, le plus courant pour un éditeur : impression, achats)
--   PERTE    → CHARGES_EXCEPT (67x, charges exceptionnelles)
--   ABONNEMENT reste SERVICES (61-62x, défaut correct)
UPDATE "Charge" SET "categorie" = 'ACHATS'         WHERE "type" = 'DEPENSE';
UPDATE "Charge" SET "categorie" = 'CHARGES_EXCEPT'  WHERE "type" = 'PERTE';
