import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const OpenSchema = z.object({
  id:             z.string().uuid(),
  pointDeVenteId: z.string().uuid(),
  nom:            z.string().optional(),
  fondOuverture:  z.number().nonnegative().default(0),
  debiterStockME: z.boolean().default(true),
})

const CloseSchema = z.object({
  fondFermeture: z.number().nonnegative().optional(),
})

export const sessionCaisseRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { pointDeVenteId, statut } = request.query as { pointDeVenteId?: string; statut?: string }
    return app.db.sessionCaisse.findMany({
      where: {
        tenantId,
        ...(pointDeVenteId && { pointDeVenteId }),
        ...(statut && { statut: statut as 'OUVERTE' | 'FERMEE' }),
      },
      include: {
        pointDeVente: { include: { categorie: true } },
        _count: { select: { ventes: true } },
      },
      orderBy: { dateOuverture: 'desc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.sessionCaisse.findFirst({
      where: { id, tenantId },
      include: {
        pointDeVente: { include: { categorie: true } },
        ventes: {
          include: { lignes: { include: { article: { select: { nom: true } } } } },
          orderBy: { dateVente: 'desc' },
        },
      },
    })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = OpenSchema.parse(request.body)
    const pdv = await app.db.pointDeVente.findFirst({ where: { id: body.pointDeVenteId, tenantId } })
    if (!pdv) return reply.notFound('Point de vente introuvable')
    return reply.status(201).send(
      await app.db.sessionCaisse.create({
        data: { ...body, tenantId },
        include: { pointDeVente: { include: { categorie: true } } },
      })
    )
  })

  app.patch('/:id/fermer', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = CloseSchema.parse(request.body)
    const existing = await app.db.sessionCaisse.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    if (existing.statut === 'FERMEE') return reply.badRequest('Session déjà fermée')
    return app.db.sessionCaisse.update({
      where: { id },
      data: { statut: 'FERMEE', dateFermeture: new Date(), ...body },
      include: { pointDeVente: { include: { categorie: true } } },
    })
  })
}
