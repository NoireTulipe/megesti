import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateRayonSchema = z.object({
  id:          z.string().uuid(),
  nom:         z.string().min(1),
  ordre:       z.number().int().nonnegative().default(0),
  isLibrairie: z.boolean().default(false),
  tauxTVA:     z.number().min(0).max(100).default(20),
})

const PatchRayonSchema = z.object({
  nom:         z.string().min(1).optional(),
  ordre:       z.number().int().nonnegative().optional(),
  isLibrairie: z.boolean().optional(),
  tauxTVA:     z.number().min(0).max(100).optional(),
})

export const rayonRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.rayon.findMany({
      where:   { tenantId },
      include: { categories: { orderBy: { ordre: 'asc' } } },
      orderBy: { ordre: 'asc' },
    })
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateRayonSchema.parse(request.body)
    const rayon = await app.db.rayon.create({ data: { ...body, tenantId } })
    return reply.status(201).send(rayon)
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchRayonSchema.parse(request.body)
    const existing = await app.db.rayon.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.rayon.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.rayon.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.rayon.delete({ where: { id } })
    return reply.status(204).send()
  })
}
