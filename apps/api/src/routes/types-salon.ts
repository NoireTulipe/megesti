import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:      z.string().uuid(),
  libelle: z.string().min(1),
})

export const typeSalonRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.typeSalon.findMany({
      where:   { tenantId },
      orderBy: { libelle: 'asc' },
    })
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.typeSalon.create({ data: { ...body, tenantId } as any })
    )
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.typeSalon.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
