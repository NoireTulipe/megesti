-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'AUTHOR');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRIAL', 'STARTER', 'PRO');

-- CreateEnum
CREATE TYPE "StatutSession" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('CB', 'ESPECES', 'CHEQUE', 'VIREMENT', 'SUMUP');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('VALIDEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'textarea', 'number', 'date', 'boolean', 'select', 'thesaurus');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('auteur', 'maisonEdition', 'depotLibraire', 'salon', 'pointDeVente');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme" JSONB,
    "plan" "PlanType" NOT NULL DEFAULT 'TRIAL',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thesaurus" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT,
    "descFr" TEXT,
    "descEn" TEXT,

    CONSTRAINT "Thesaurus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThesaurusEntry" (
    "id" TEXT NOT NULL,
    "thesaurusId" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,

    CONSTRAINT "ThesaurusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriePointDeVente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoriePointDeVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointDeVente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categorieId" TEXT,
    "nom" TEXT NOT NULL,
    "commissionFixe" DECIMAL(10,2),
    "commissionPourcent" DECIMAL(5,2),
    "encaissementDirect" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointDeVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCaisse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pointDeVenteId" TEXT NOT NULL,
    "salonId" TEXT,
    "nom" TEXT,
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFermeture" TIMESTAMP(3),
    "fondOuverture" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fondFermeture" DECIMAL(10,2),
    "debiterStockME" BOOLEAN NOT NULL DEFAULT true,
    "statut" "StatutSession" NOT NULL DEFAULT 'OUVERTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "dateVente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" "ModePaiement" NOT NULL,
    "totalHT" DECIMAL(10,2) NOT NULL,
    "totalTVA" DECIMAL(10,2) NOT NULL,
    "totalTTC" DECIMAL(10,2) NOT NULL,
    "statut" "StatutVente" NOT NULL DEFAULT 'VALIDEE',
    "noteAnnulation" TEXT,
    "previousHash" VARCHAR(64),
    "hash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneVente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaireHT" DECIMAL(10,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "totalLigneHT" DECIMAL(10,2) NOT NULL,
    "totalLigneTTC" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "LigneVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rayon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "isLibrairie" BOOLEAN NOT NULL DEFAULT false,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20,

    CONSTRAINT "Rayon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rayonId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rayonId" TEXT NOT NULL,
    "categorieId" TEXT,
    "nom" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "prixVenteHT" DECIMAL(10,2) NOT NULL,
    "prixAchatHT" DECIMAL(10,2),
    "prixAchatLotHT" DECIMAL(10,2),
    "prixAchatLotQte" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockAlerte" INTEGER NOT NULL DEFAULT 0,
    "stockTension" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "isbn" TEXT,
    "datePublication" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleAuteur" (
    "articleId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleAuteur_pkey" PRIMARY KEY ("articleId","auteurId")
);

-- CreateTable
CREATE TABLE "Auteur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "pseudonyme" TEXT,
    "email" TEXT,
    "bio" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaisonEdition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaisonEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepotLibraire" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepotLibraire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "lieu" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" "EntityType",
    "rayonId" TEXT,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT,
    "fieldType" "FieldType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "thesaurusId" TEXT,
    "options" JSONB,
    "category" TEXT,
    "halfWidth" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "validation" JSONB,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Thesaurus_tenantId_idx" ON "Thesaurus"("tenantId");

-- CreateIndex
CREATE INDEX "ThesaurusEntry_thesaurusId_idx" ON "ThesaurusEntry"("thesaurusId");

-- CreateIndex
CREATE INDEX "ThesaurusEntry_parentId_idx" ON "ThesaurusEntry"("parentId");

-- CreateIndex
CREATE INDEX "CategoriePointDeVente_tenantId_idx" ON "CategoriePointDeVente"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriePointDeVente_tenantId_nom_key" ON "CategoriePointDeVente"("tenantId", "nom");

-- CreateIndex
CREATE INDEX "PointDeVente_tenantId_idx" ON "PointDeVente"("tenantId");

-- CreateIndex
CREATE INDEX "SessionCaisse_tenantId_idx" ON "SessionCaisse"("tenantId");

-- CreateIndex
CREATE INDEX "SessionCaisse_pointDeVenteId_idx" ON "SessionCaisse"("pointDeVenteId");

-- CreateIndex
CREATE INDEX "SessionCaisse_salonId_idx" ON "SessionCaisse"("salonId");

-- CreateIndex
CREATE INDEX "Vente_tenantId_idx" ON "Vente"("tenantId");

-- CreateIndex
CREATE INDEX "Vente_sessionId_idx" ON "Vente"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_tenantId_numero_key" ON "Vente"("tenantId", "numero");

-- CreateIndex
CREATE INDEX "LigneVente_venteId_idx" ON "LigneVente"("venteId");

-- CreateIndex
CREATE INDEX "LigneVente_articleId_idx" ON "LigneVente"("articleId");

-- CreateIndex
CREATE INDEX "Rayon_tenantId_idx" ON "Rayon"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Rayon_tenantId_nom_key" ON "Rayon"("tenantId", "nom");

-- CreateIndex
CREATE INDEX "Categorie_tenantId_idx" ON "Categorie"("tenantId");

-- CreateIndex
CREATE INDEX "Categorie_rayonId_idx" ON "Categorie"("rayonId");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_rayonId_nom_key" ON "Categorie"("rayonId", "nom");

-- CreateIndex
CREATE INDEX "Article_tenantId_idx" ON "Article"("tenantId");

-- CreateIndex
CREATE INDEX "Article_tenantId_rayonId_idx" ON "Article"("tenantId", "rayonId");

-- CreateIndex
CREATE INDEX "ArticleAuteur_auteurId_idx" ON "ArticleAuteur"("auteurId");

-- CreateIndex
CREATE INDEX "Auteur_tenantId_idx" ON "Auteur"("tenantId");

-- CreateIndex
CREATE INDEX "MaisonEdition_tenantId_idx" ON "MaisonEdition"("tenantId");

-- CreateIndex
CREATE INDEX "DepotLibraire_tenantId_idx" ON "DepotLibraire"("tenantId");

-- CreateIndex
CREATE INDEX "Salon_tenantId_idx" ON "Salon"("tenantId");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entityType_idx" ON "CustomFieldDefinition"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_rayonId_idx" ON "CustomFieldDefinition"("tenantId", "rayonId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityId_idx" ON "CustomFieldValue"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_entityId_key" ON "CustomFieldValue"("definitionId", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thesaurus" ADD CONSTRAINT "Thesaurus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesaurusEntry" ADD CONSTRAINT "ThesaurusEntry_thesaurusId_fkey" FOREIGN KEY ("thesaurusId") REFERENCES "Thesaurus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesaurusEntry" ADD CONSTRAINT "ThesaurusEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ThesaurusEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriePointDeVente" ADD CONSTRAINT "CategoriePointDeVente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointDeVente" ADD CONSTRAINT "PointDeVente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointDeVente" ADD CONSTRAINT "PointDeVente_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "CategoriePointDeVente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_pointDeVenteId_fkey" FOREIGN KEY ("pointDeVenteId") REFERENCES "PointDeVente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rayon" ADD CONSTRAINT "Rayon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_rayonId_fkey" FOREIGN KEY ("rayonId") REFERENCES "Rayon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_rayonId_fkey" FOREIGN KEY ("rayonId") REFERENCES "Rayon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleAuteur" ADD CONSTRAINT "ArticleAuteur_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleAuteur" ADD CONSTRAINT "ArticleAuteur_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auteur" ADD CONSTRAINT "Auteur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaisonEdition" ADD CONSTRAINT "MaisonEdition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepotLibraire" ADD CONSTRAINT "DepotLibraire_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_rayonId_fkey" FOREIGN KEY ("rayonId") REFERENCES "Rayon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
