-- CreateEnum
CREATE TYPE "PopupMode" AS ENUM ('SHOW_ONCE', 'DISMISSIBLE', 'ALWAYS_CLOSABLE', 'ALWAYS_BLOCKING');

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "mode" "PopupMode" NOT NULL DEFAULT 'DISMISSIBLE',
    "dismissText" TEXT NOT NULL DEFAULT 'Ne plus afficher ce message',
    "slides" JSONB NOT NULL,
    "targetPages" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupVu" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "vuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupVu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PopupVu_userId_idx" ON "PopupVu"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PopupVu_userId_popupId_key" ON "PopupVu"("userId", "popupId");

-- AddForeignKey
ALTER TABLE "PopupVu" ADD CONSTRAINT "PopupVu_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopupVu" ADD CONSTRAINT "PopupVu_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
