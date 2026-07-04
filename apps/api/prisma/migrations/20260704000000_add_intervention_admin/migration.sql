-- CreateTable
CREATE TABLE "InterventionAdmin" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "note" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterventionAdmin_tenantId_idx" ON "InterventionAdmin"("tenantId");

-- CreateIndex
CREATE INDEX "InterventionAdmin_createdAt_idx" ON "InterventionAdmin"("createdAt");

-- AddForeignKey
ALTER TABLE "InterventionAdmin" ADD CONSTRAINT "InterventionAdmin_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionAdmin" ADD CONSTRAINT "InterventionAdmin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
