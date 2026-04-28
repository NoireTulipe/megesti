-- CreateTable
CREATE TABLE "TypeDA" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "formule" JSONB NOT NULL,

    CONSTRAINT "TypeDA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratAuteur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "typeDAId" TEXT NOT NULL,
    "articleId" TEXT,
    "avance" DECIMAL(10,2),
    "avanceDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratAuteur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TypeDA_tenantId_idx" ON "TypeDA"("tenantId");

-- CreateIndex
CREATE INDEX "ContratAuteur_tenantId_idx" ON "ContratAuteur"("tenantId");

-- CreateIndex
CREATE INDEX "ContratAuteur_auteurId_idx" ON "ContratAuteur"("auteurId");

-- CreateIndex
CREATE INDEX "ContratAuteur_typeDAId_idx" ON "ContratAuteur"("typeDAId");

-- AddForeignKey
ALTER TABLE "TypeDA" ADD CONSTRAINT "TypeDA_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratAuteur" ADD CONSTRAINT "ContratAuteur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratAuteur" ADD CONSTRAINT "ContratAuteur_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratAuteur" ADD CONSTRAINT "ContratAuteur_typeDAId_fkey" FOREIGN KEY ("typeDAId") REFERENCES "TypeDA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratAuteur" ADD CONSTRAINT "ContratAuteur_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
