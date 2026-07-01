-- AlterTable: add auteurId to Vente (ventes d'exemplaires auteurs)
ALTER TABLE "Vente" ADD COLUMN "auteurId" TEXT;

-- Index
CREATE INDEX "Vente_auteurId_idx" ON "Vente"("auteurId");

-- Foreign key
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_auteurId_fkey"
  FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
