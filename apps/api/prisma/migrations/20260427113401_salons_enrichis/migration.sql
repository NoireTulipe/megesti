-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "commentaires" TEXT,
ADD COLUMN     "dureeJours" INTEGER,
ADD COLUMN     "note" INTEGER,
ADD COLUMN     "pays" TEXT,
ADD COLUMN     "periodeHabituelle" TEXT,
ADD COLUMN     "prixPrevuFixe" DECIMAL(10,2),
ADD COLUMN     "prixPrevuPct" DECIMAL(5,2),
ADD COLUMN     "typeSalonId" TEXT,
ADD COLUMN     "ville" TEXT;

-- CreateTable
CREATE TABLE "TypeSalon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "TypeSalon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSalon" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,

    CONSTRAINT "ContactSalon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TypeSalon_tenantId_idx" ON "TypeSalon"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TypeSalon_tenantId_libelle_key" ON "TypeSalon"("tenantId", "libelle");

-- CreateIndex
CREATE INDEX "ContactSalon_salonId_idx" ON "ContactSalon"("salonId");

-- AddForeignKey
ALTER TABLE "TypeSalon" ADD CONSTRAINT "TypeSalon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_typeSalonId_fkey" FOREIGN KEY ("typeSalonId") REFERENCES "TypeSalon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSalon" ADD CONSTRAINT "ContactSalon_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
