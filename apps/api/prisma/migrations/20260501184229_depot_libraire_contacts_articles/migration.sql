/*
  Warnings:

  - You are about to drop the column `contact` on the `DepotLibraire` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DepotLibraire" DROP COLUMN "contact",
ADD COLUMN     "commissionFixe" DECIMAL(10,2),
ADD COLUMN     "commissionPourcent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "ContactDepotLibraire" (
    "id" TEXT NOT NULL,
    "depotLibraireId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,

    CONSTRAINT "ContactDepotLibraire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleDepot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "depotLibraireId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "quantiteEnvoyee" INTEGER NOT NULL,
    "quantiteVendue" INTEGER NOT NULL DEFAULT 0,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleDepot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactDepotLibraire_depotLibraireId_idx" ON "ContactDepotLibraire"("depotLibraireId");

-- CreateIndex
CREATE INDEX "ArticleDepot_tenantId_idx" ON "ArticleDepot"("tenantId");

-- CreateIndex
CREATE INDEX "ArticleDepot_depotLibraireId_idx" ON "ArticleDepot"("depotLibraireId");

-- CreateIndex
CREATE INDEX "ArticleDepot_articleId_idx" ON "ArticleDepot"("articleId");

-- AddForeignKey
ALTER TABLE "ContactDepotLibraire" ADD CONSTRAINT "ContactDepotLibraire_depotLibraireId_fkey" FOREIGN KEY ("depotLibraireId") REFERENCES "DepotLibraire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDepot" ADD CONSTRAINT "ArticleDepot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDepot" ADD CONSTRAINT "ArticleDepot_depotLibraireId_fkey" FOREIGN KEY ("depotLibraireId") REFERENCES "DepotLibraire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDepot" ADD CONSTRAINT "ArticleDepot_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
