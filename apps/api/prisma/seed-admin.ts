/**
 * Crée le premier compte AdminUser si aucun n'existe.
 * Usage : pnpm tsx prisma/seed-admin.ts
 * Vars d'env : ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOM
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email    = process.env['ADMIN_EMAIL']    ?? 'admin@megesti.fr'
  const password = process.env['ADMIN_PASSWORD'] ?? (() => { throw new Error('ADMIN_PASSWORD requis') })()
  const nom      = process.env['ADMIN_NOM']      ?? 'Super Admin'

  const existing = await db.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin "${email}" existe déjà.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.adminUser.create({ data: { email, passwordHash, nom } })
  console.log(`Admin "${email}" créé avec succès.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
