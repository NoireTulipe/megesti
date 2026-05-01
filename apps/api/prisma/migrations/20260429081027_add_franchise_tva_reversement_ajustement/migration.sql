-- AlterTable
ALTER TABLE "Reversement" ADD COLUMN     "montantAjuste" DECIMAL(10,2),
ADD COLUMN     "noteAjustement" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "franchiseBaseVA" BOOLEAN NOT NULL DEFAULT false;
