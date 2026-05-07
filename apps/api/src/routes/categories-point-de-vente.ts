import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:    z.string().uuid(),
  nom:   z.string().min(1),
  ordre: z.number().int().nonnegative().default(0),
})

export const categoriePointDeVenteRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.categoriePointDeVente.findMany({
      where:   { tenantId },
      orderBy: { ordre: 'asc' },
    })
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.categoriePointDeVente.create({ data: { ...body, tenantId } as any })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = CreateSchema.omit({ id: true }).partial().parse(request.body)
    const existing = await app.db.categoriePointDeVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.categoriePointDeVente.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.categoriePointDeVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.categoriePointDeVente.delete({ where: { id } })
    return reply.status(204).send()
  })
}
