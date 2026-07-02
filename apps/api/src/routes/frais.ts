import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { assertTenantOwned } from '../lib/ownership.js'

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
    // Retourne TOUS les frais (actif et inactifs) — le frontend gère l'affichage rayé
    return app.db.frais.findMany({
      where: { tenantId, ...(sessionId ? { sessionId } : {}) },
      orderBy: { date: 'desc' },
    })
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    await assertTenantOwned(app.db, 'sessionCaisse', body.sessionId, tenantId)
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
    await assertTenantOwned(app.db, 'sessionCaisse', body.sessionId, tenantId)
    return app.db.frais.update({ where: { id }, data: body })
  })

  app.delete('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.frais.findFirst({ where: { id, tenantId, actif: true } })
    if (!existing) return reply.notFound()
    await app.db.frais.update({ where: { id }, data: { actif: false } })
    return reply.status(204).send()
  })
}
