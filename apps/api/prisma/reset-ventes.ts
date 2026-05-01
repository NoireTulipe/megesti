/**
 * reset-ventes.ts — Efface toutes les ventes, sessions et reversements.
 * Conserve : tenant, users, articles, auteurs, réglages, tout le reste.
 * Usage : pnpm db:reset-ventes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Nettoyage des ventes, sessions et reversements...')

  // Ordre : respect des contraintes FK
  const [rev, lignes, ventes, frais, archivesJ, sessions, mvts] = await Promise.all([
    prisma.reversement.deleteMany(),
    prisma.ligneVente.deleteMany(),
    prisma.frais.deleteMany(),
    prisma.archiveJournaliere.deleteMany(),
    prisma.mouvementStock.deleteMany(),
  ])

  await prisma.vente.deleteMany()
  await prisma.sessionCaisse.deleteMany()

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Données transactionnelles effacées.')
  console.log('')
  console.log('   Conservés : tenant, users, articles, auteurs,')
  console.log('               salons, PDV, réglages, imprimeurs...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
