import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const tenants = await db.tenant.findMany({ select: { id: true, name: true, slug: true, actif: true, plan: true, siret: true, pdpStatut: true } })
  const users = await db.user.findMany({ select: { email: true, role: true, active: true, tenantId: true } })
  console.log(JSON.stringify({ tenants, users }, null, 2))
  await db.$disconnect()
}
main()
