import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const ConditionRegleSchema = z.object({
  vendeur:        z.enum(['AUTEUR', 'ME']).optional(),
  avecCommission: z.boolean().optional(),
  typeVente:      z.enum(['DIRECTE', 'DEPOT', 'SALON']).optional(),
})

const RegleDASchema = z.object({
  conditions: ConditionRegleSchema,
  taux:       z.number().min(0).max(100),
  base:       z.enum(['HT', 'TTC']),
})

const FormuleDASchema = z.object({
  lignes: z.array(RegleDASchema).min(1),
})

const CreateSchema = z.object({
  id:      z.string().uuid(),
  nom:     z.string().min(1),
  formule: FormuleDASchema,
})

const PatchSchema = z.object({
  nom:     z.string().min(1).optional(),
  formule: FormuleDASchema.optional(),
})

export const typeDARoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.typeDA.findMany({
      where:   { tenantId },
      include: { _count: { select: { contrats: true } } },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.typeDA.findFirst({
      where:   { id, tenantId },
      include: { _count: { select: { contrats: true } } },
    })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.typeDA.create({ data: { ...body, tenantId } as any })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.typeDA.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.typeDA.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.typeDA.findFirst({
      where:   { id, tenantId },
      include: { _count: { select: { contrats: true } } },
    })
    if (!existing) return reply.notFound()
    if (existing._count.contrats > 0)
      return reply.badRequest('Ce barème est utilisé par des contrats existants')
    await app.db.typeDA.delete({ where: { id } })
    return reply.status(204).send()
  })
}
