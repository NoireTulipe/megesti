import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:      z.string().uuid(),
  nom:     z.string().min(1),
  contact: z.string().optional(),
  adresse: z.string().optional(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const depotLibraireRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.depotLibraire.findMany({
      where: {
        tenantId,
        actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    const rec = await app.db.depotLibraire.create({ data: { ...body, tenantId } })
    return reply.status(201).send(rec)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.depotLibraire.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.depotLibraire.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
