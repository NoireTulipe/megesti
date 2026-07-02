-- Matières premières : articles avec stock géré mais exclus de la vente
ALTER TABLE "Article" ADD COLUMN "vendable" BOOLEAN NOT NULL DEFAULT true;
