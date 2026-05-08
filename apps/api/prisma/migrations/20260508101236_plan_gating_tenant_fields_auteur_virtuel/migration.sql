-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlanType" ADD VALUE 'AUTO_EDITION';
ALTER TYPE "PlanType" ADD VALUE 'EDITION';
ALTER TYPE "PlanType" ADD VALUE 'EDITION_PRO';

-- AlterTable
ALTER TABLE "Auteur" ADD COLUMN     "isVirtuel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "presentation" TEXT,
ADD COLUMN     "siteWeb" TEXT;

-- CreateTable
CREATE TABLE "ContactTenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "fonction" TEXT,

    CONSTRAINT "ContactTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactTenant_tenantId_idx" ON "ContactTenant"("tenantId");

-- AddForeignKey
ALTER TABLE "ContactTenant" ADD CONSTRAINT "ContactTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
