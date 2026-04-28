-- CreateTable
CREATE TABLE "ArchiveJournaliere" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dateArchive" TIMESTAMP(3) NOT NULL,
    "totalVentes" INTEGER NOT NULL,
    "totalTTC" DECIMAL(12,2) NOT NULL,
    "dernierHash" VARCHAR(64) NOT NULL,
    "dernierNumero" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveJournaliere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveJournaliere_tenantId_idx" ON "ArchiveJournaliere"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveJournaliere_tenantId_dateArchive_key" ON "ArchiveJournaliere"("tenantId", "dateArchive");

-- AddForeignKey
ALTER TABLE "ArchiveJournaliere" ADD CONSTRAINT "ArchiveJournaliere_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
