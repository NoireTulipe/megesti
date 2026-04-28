/*
  Warnings:

  - You are about to drop the column `dateDebut` on the `ContratAuteur` table. All the data in the column will be lost.
  - You are about to drop the column `dateFin` on the `ContratAuteur` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[salonId]` on the table `PointDeVente` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ContratAuteur" DROP COLUMN "dateDebut",
DROP COLUMN "dateFin",
ADD COLUMN     "datePriseEffet" TIMESTAMP(3),
ADD COLUMN     "dateSignature" TIMESTAMP(3),
ADD COLUMN     "dureeAns" INTEGER,
ADD COLUMN     "reconduiteTacite" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PointDeVente" ADD COLUMN     "salonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PointDeVente_salonId_key" ON "PointDeVente"("salonId");

-- CreateIndex
CREATE INDEX "PointDeVente_salonId_idx" ON "PointDeVente"("salonId");

-- AddForeignKey
ALTER TABLE "PointDeVente" ADD CONSTRAINT "PointDeVente_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
