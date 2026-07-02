import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const PatchSchema = z.object({
  franchiseTva:  z.boolean().optional(),
  name:          z.string().min(1).optional(),
  presentation:  z.string().optional().nullable(),
  siteWeb:       z.string().url().optional().nullable().or(z.literal('')),
  logo:          z.string().url().optional().nullable(),
})

export const monTenantRoutes: FastifyPluginAsync = async (app) => {
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const { tenantId } = request.tenant
    return app.db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, plan: true,
        franchiseTva: true, logo: true, siteWeb: true, presentation: true,
        createdAt: true,
      },
    })
  })

  app.patch('/', authAdmin, async (request) => {
    const { tenantId } = request.tenant
    const body = PatchSchema.parse(request.body)
    return app.db.tenant.update({
      where: { id: tenantId },
      data:  body,
      select: {
        id: true, name: true, slug: true, plan: true,
        franchiseTva: true, logo: true, siteWeb: true, presentation: true,
      },
    })
  })
}
