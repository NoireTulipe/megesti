import { PrismaClient } from '@prisma/client'
import { createSigner } from 'fast-jwt'
const db = new PrismaClient()
async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: 'verif-pdp' },
    update: {},
    create: { name: 'Verif SuperPdP', slug: 'verif-pdp', plan: 'EDITION', siret: '12345678900011' },
  })
  const user = await db.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@verif.test' } },
    update: {},
    create: { tenantId: tenant.id, email: 'admin@verif.test', passwordHash: 'x', firstName: 'Vérif', lastName: 'Admin', role: 'ADMIN' },
  }).catch(async () => db.user.create({
    data: { tenantId: tenant.id, email: 'admin@verif.test', passwordHash: 'x', firstName: 'Vérif', lastName: 'Admin', role: 'ADMIN' },
  }))
  const editor = await db.user.create({
    data: { tenantId: tenant.id, email: 'editor@verif.test', passwordHash: 'x', firstName: 'Vérif', lastName: 'Editor', role: 'EDITOR' },
  }).catch(() => db.user.findFirst({ where: { tenantId: tenant.id, role: 'EDITOR' } }))
  const sign = createSigner({ key: process.env['JWT_SECRET']!, expiresIn: 3600_000 })
  console.log(JSON.stringify({
    tenantId: tenant.id,
    tenantToken: sign({ tenantId: tenant.id, userId: user.id, role: 'ADMIN', plan: tenant.plan }),
    editorToken: sign({ tenantId: tenant.id, userId: editor!.id, role: 'EDITOR', plan: tenant.plan }),
    adminToken:  sign({ adminId: 'verif-local', role: 'SUPERADMIN' }),
  }))
  await db.$disconnect()
}
main()
