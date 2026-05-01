import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const EncaisserSchema = z.object({
  modePaiement:     z.enum(['VIREMENT', 'CHEQUE']),
  dateEncaissement: z.string().optional().transform(v => v ? new Date(v) : new Date()),
  reference:        z.string().optional().nullable(),
  notes:            z.string().optional().nullable(),
})

const INCLUDE = {
  pointDeVente: { select: { id: true, nom: true, commissionPourcent: true, commissionFixe: true } },
  session:      { select: { id: true, nom: true, dateOuverture: true, dateFermeture: true } },
}

export const reversementRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { statut } = request.query as { statut?: string }
    return app.db.reversement.findMany({
      where: {
        tenantId,
        ...(statut ? { statut: statut as 'EN_ATTENTE' | 'ENCAISSE' | 'ANNULE' } : {}),
      },
      include: INCLUDE,
      orderBy: { dateCloture: 'desc' },
    })
  })

  // Totaux rapides pour le dashboard / bilan
  app.get('/totaux', auth, async (request) => {
    const { tenantId } = request.tenant
    const [attente, encaisse] = await Promise.all([
      app.db.reversement.aggregate({
        where: { tenantId, statut: 'EN_ATTENTE' },
        _sum:   { montantTTC: true },
        _count: { _all: true },
      }),
      app.db.reversement.aggregate({
        where: { tenantId, statut: 'ENCAISSE' },
        _sum: { montantTTC: true },
      }),
    ])
    return {
      enAttente:  { montant: Number(attente._sum.montantTTC ?? 0), nb: attente._count._all },
      encaisse:   { montant: Number(encaisse._sum.montantTTC ?? 0) },
    }
  })

  app.patch('/:id/encaisser', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = EncaisserSchema.parse(request.body)

    const rev = await app.db.reversement.findFirst({ where: { id, tenantId } })
    if (!rev) return reply.notFound()
    if (rev.statut !== 'EN_ATTENTE') return reply.badRequest('Ce reversement n\'est pas en attente')

    return app.db.reversement.update({
      where: { id },
      data:  { statut: 'ENCAISSE', ...body },
      include: INCLUDE,
    })
  })

  app.patch('/:id/ajuster', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { montantAjuste, noteAjustement } = z.object({
      montantAjuste:  z.number().nonnegative(),
      noteAjustement: z.string().min(1),
    }).parse(request.body)
    const rev = await app.db.reversement.findFirst({ where: { id, tenantId } })
    if (!rev) return reply.notFound()
    return app.db.reversement.update({
      where: { id },
      data: { montantAjuste, noteAjustement },
      include: INCLUDE,
    })
  })

  app.patch('/:id/annuler', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rev = await app.db.reversement.findFirst({ where: { id, tenantId } })
    if (!rev) return reply.notFound()
    return app.db.reversement.update({ where: { id }, data: { statut: 'ANNULE' }, include: INCLUDE })
  })
}
