import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateCategorieSchema = z.object({
  id:      z.string().uuid(),
  rayonId: z.string().uuid(),
  nom:     z.string().min(1),
  ordre:   z.number().int().nonnegative().default(0),
})

const PatchCategorieSchema = z.object({
  nom:   z.string().min(1).optional(),
  ordre: z.number().int().nonnegative().optional(),
})

export const categorieRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { rayonId } = z.object({ rayonId: z.string().uuid().optional() }).parse(request.query)
    return app.db.categorie.findMany({
      where:   { tenantId, ...(rayonId ? { rayonId } : {}) },
      orderBy: { ordre: 'asc' },
    })
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateCategorieSchema.parse(request.body)
    const rayon = await app.db.rayon.findFirst({ where: { id: body.rayonId, tenantId } })
    if (!rayon) return reply.notFound()
    const categorie = await app.db.categorie.create({ data: { ...body, tenantId } as any })
    return reply.status(201).send(categorie)
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchCategorieSchema.parse(request.body)
    const existing = await app.db.categorie.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.categorie.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.categorie.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.categorie.delete({ where: { id } })
    return reply.status(204).send()
  })
}
