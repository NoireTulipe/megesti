import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const DesannulerSchema = z.object({
  tenantId: z.string().uuid(),
  venteId:  z.string().uuid(),
  ticket:   z.string().min(1, 'Référence de ticket obligatoire'),
  note:     z.string().optional(),
})

export const adminInterventionRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticateAdmin }

  // ── Recherche d'une vente par numéro (préparation d'intervention) ──────────
  app.get('/tenants/:tenantId/ventes/numero/:numero', auth, async (request, reply) => {
    const { tenantId, numero } = request.params as { tenantId: string; numero: string }
    const num = Number(numero)
    if (!Number.isInteger(num)) return reply.badRequest('Numéro de vente invalide')

    const ventes = await app.db.vente.findMany({
      where: { tenantId, numero: num },
      include: {
        session: { select: { id: true, debiterStockME: true } },
        lignes:  { include: { article: { select: { id: true, nom: true, stock: true } } } },
      },
    })
    if (ventes.length === 0) return reply.notFound('Aucune vente avec ce numéro pour ce tenant')
    if (ventes.length > 1)   return reply.badRequest('Plusieurs ventes portent ce numéro — intervention manuelle requise')
    return ventes[0]
  })

  // ── Journal des interventions ───────────────────────────────────────────────
  app.get('/interventions', auth, async () => {
    return app.db.interventionAdmin.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        admin:  { select: { nom: true } },
        tenant: { select: { name: true } },
      },
    })
  })

  // ── Désannulation d'une vente — miroir exact de PATCH /ventes/:id/annuler ──
  // Le hash chaîné ne couvre pas le statut : l'intégrité de la caisse n'est pas
  // affectée. La trace est portée par InterventionAdmin (ticket obligatoire).
  app.post('/interventions/desannuler-vente', auth, async (request, reply) => {
    const { tenantId, venteId, ticket, note } = DesannulerSchema.parse(request.body)

    const existing = await app.db.vente.findFirst({
      where: { id: venteId, tenantId },
      include: { session: true, lignes: true },
    })
    if (!existing) return reply.notFound()
    if (existing.statut !== 'ANNULEE') return reply.badRequest('Cette vente n\'est pas annulée')

    // L'annulation avait re-crédité le stock selon la même règle qu'à la
    // création : en session on suit debiterStockME, hors session on débite.
    const stockDebite = existing.session ? existing.session.debiterStockME : true

    const updated = await app.db.$transaction(async (tx) => {
      const v = await tx.vente.update({
        where: { id: venteId },
        data:  { statut: 'VALIDEE', noteAnnulation: null },
        include: { lignes: { include: { article: { select: { id: true, nom: true } } } } },
      })
      if (stockDebite) {
        for (const l of existing.lignes) {
          await tx.article.update({ where: { id: l.articleId }, data: { stock: { decrement: l.quantite } } })
        }
      }
      await tx.interventionAdmin.create({
        data: {
          adminId: request.admin.adminId,
          tenantId,
          action:  'DESANNULATION_VENTE',
          ticket,
          note:    note ?? null,
          detail: {
            venteId,
            numero:         existing.numero,
            totalTTC:       Number(existing.totalTTC),
            noteAnnulation: existing.noteAnnulation,
            stockRedebite:  stockDebite,
          },
        },
      })
      return v
    })

    return updated
  })
}
