import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:                 z.string().uuid(),
  nom:                z.string().min(1),
  categorieId:        z.string().uuid().optional().nullable(),
  commissionFixe:     z.number().nonnegative().optional().nullable(),
  commissionPourcent: z.number().min(0).max(100).optional().nullable(),
  encaissementDirect: z.boolean().default(true),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const pointDeVenteRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.pointDeVente.findMany({
      where: {
        tenantId, actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include: { categorie: true },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.pointDeVente.findFirst({
      where: { id, tenantId },
      include: { categorie: true },
    })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.pointDeVente.create({
        data: { ...body, tenantId },
        include: { categorie: true },
      })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.pointDeVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.pointDeVente.update({
      where: { id }, data: body,
      include: { categorie: true },
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.pointDeVente.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
