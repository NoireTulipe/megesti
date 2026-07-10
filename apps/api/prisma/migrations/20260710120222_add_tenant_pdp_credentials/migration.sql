-- CreateEnum
CREATE TYPE "PdpEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "PdpStatut" AS ENUM ('A_CONFIGURER', 'ACTIF');

-- DropIndex
DROP INDEX "FactureEmission_tenantId_idx";

-- AlterTable
ALTER TABLE "FactureEmission" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "pdpActivatedAt" TIMESTAMP(3),
ADD COLUMN     "pdpClientId" TEXT,
ADD COLUMN     "pdpClientSecretEnc" TEXT,
ADD COLUMN     "pdpEnvironment" "PdpEnvironment" NOT NULL DEFAULT 'SANDBOX',
ADD COLUMN     "pdpStatut" "PdpStatut" NOT NULL DEFAULT 'A_CONFIGURER',
ALTER COLUMN "pdpAfnorSyncAt" SET DATA TYPE TIMESTAMP(3);
