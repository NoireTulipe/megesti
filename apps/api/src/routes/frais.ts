import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:        z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  type:      z.enum(['DON', 'PERTE_STOCK', 'DEPLACEMENT', 'REPAS', 'HEBERGEMENT', 'STAND', 'AUTRE']),
  motif:     z.string().min(1),
  montantHT: z.number().nonnegative().optional(),
  date:      z.string().optional().transform((v) => v ? new Date(v) : new Date()),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const fraisRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { sessionId } = request.query as { sessionId?: string }
    return app.db.frais.findMany({
      where: { tenantId, ...(sessionId ? { sessionId } : {}) },
      orderBy: { date: 'desc' },
    })
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    const rec = await app.db.frais.create({
      data: { ...body, tenantId } as any,
    })
    return reply.status(201).send(rec)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.frais.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.frais.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.frais.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
