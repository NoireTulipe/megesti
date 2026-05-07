import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const ContactSchema = z.object({
  nom:       z.string().min(1),
  prenom:    z.string().optional(),
  email:     z.string().optional(),
  telephone: z.string().optional(),
  fonction:  z.string().optional(),
})

export const contactsTenantRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  // Liste
  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const { tenantId } = request.tenant
    return app.db.contactTenant.findMany({
      where: { tenantId },
      orderBy: { nom: 'asc' },
    })
  })

  // Créer
  app.post('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const body = ContactSchema.parse(request.body)
    return app.db.contactTenant.create({
      data: { ...body, tenantId } as any,
    })
  })

  // Modifier
  app.patch('/:id', auth, async (request) => {
    const { tenantId } = request.tenant
    const { id }    = request.params as { id: string }
    const body = ContactSchema.partial().parse(request.body)
    await app.db.contactTenant.findFirstOrThrow({ where: { id, tenantId } })
    return app.db.contactTenant.update({ where: { id }, data: body })
  })

  // Supprimer
  app.delete('/:id', auth, async (request) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.contactTenant.findFirstOrThrow({ where: { id, tenantId } })
    await app.db.contactTenant.delete({ where: { id } })
    return { ok: true }
  })
}
