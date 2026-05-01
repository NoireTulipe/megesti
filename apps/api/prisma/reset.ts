/**
 * reset.ts — Remet la base à zéro et crée un compte test propre.
 * Usage : pnpm db:reset
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_ID = '10000000-0000-0000-0000-000000000001'
const USER_ID   = '10000000-0000-0000-0000-000000000002'

async function main() {
  console.log('🧹 Nettoyage de la base...')

  // Supprimer tous les tenants — cascade automatique sur toutes les tables liées
  await prisma.tenant.deleteMany()

  console.log('✓ Base vidée.')
  console.log('🌱 Création du compte test...')

  const passwordHash = await bcrypt.hash('fanfanlt', 12)

  await prisma.tenant.create({
    data: {
      id:   TENANT_ID,
      name: 'Écho de Plumes',
      slug: 'echodeplumes',
      plan: 'PRO',
      users: {
        create: {
          id:           USER_ID,
          email:        'contact@echodeplumes.com',
          passwordHash,
          firstName:    'François',
          lastName:     'Bonacci',
          role:         'ADMIN',
        },
      },
    },
  })

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Base réinitialisée.')
  console.log('')
  console.log('   Email    : contact@echodeplumes.com')
  console.log('   Mot de passe : fanfanlt')
  console.log('   Rôle     : ADMIN')
  console.log('   Plan     : PRO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
