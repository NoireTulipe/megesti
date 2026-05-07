import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const MOTIFS_DEFAUT = [
  { libelle: 'Vente à distance', ordre: 0 },
  { libelle: 'Commande librairie', ordre: 1 },
  { libelle: 'Commande site web', ordre: 2 },
  { libelle: 'Vente autre', ordre: 3 },
]

const CreateSchema = z.object({
  id:      z.string().uuid(),
  libelle: z.string().min(1),
  ordre:   z.number().int().default(0),
})

const PatchSchema = z.object({
  libelle: z.string().min(1).optional(),
  ordre:   z.number().int().optional(),
})

export const motifVenteRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant

    // Auto-créer les motifs par défaut si aucun n'existe
    const count = await app.db.motifVente.count({ where: { tenantId } })
    if (count === 0) {
      await app.db.motifVente.createMany({
        data: MOTIFS_DEFAUT.map(m => ({ ...m, id: crypto.randomUUID(), tenantId })),
      })
    }

    return app.db.motifVente.findMany({
      where:   { tenantId, actif: true },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
    })
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.motifVente.create({ data: { ...body, tenantId } as any })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.motifVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.motifVente.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.motifVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.motifVente.update({ where: { id }, data: { actif: false } })
    return reply.status(204).send()
  })
}
