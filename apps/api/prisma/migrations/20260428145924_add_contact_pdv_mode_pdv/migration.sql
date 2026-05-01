-- CreateEnum
CREATE TYPE "TypePaiementRemise" AS ENUM ('VIREMENT', 'CHEQUE');

-- AlterEnum
ALTER TYPE "ModePaiement" ADD VALUE 'PDV';

-- CreateTable
CREATE TABLE "ContactPointDeVente" (
    "id" TEXT NOT NULL,
    "pointDeVenteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "typePaiement" "TypePaiementRemise",

    CONSTRAINT "ContactPointDeVente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactPointDeVente_pointDeVenteId_idx" ON "ContactPointDeVente"("pointDeVenteId");

-- AddForeignKey
ALTER TABLE "ContactPointDeVente" ADD CONSTRAINT "ContactPointDeVente_pointDeVenteId_fkey" FOREIGN KEY ("pointDeVenteId") REFERENCES "PointDeVente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
