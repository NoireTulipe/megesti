import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const LigneSchema = z.object({
  articleId: z.string().uuid(),
  quantite:  z.number().int().positive(),
})

const CreateVenteSchema = z.object({
  id:           z.string().uuid(),
  sessionId:    z.string().uuid(),
  modePaiement: z.enum(['CB', 'ESPECES', 'CHEQUE', 'VIREMENT']),
  lignes:       z.array(LigneSchema).min(1),
})

const AnnulerSchema = z.object({
  noteAnnulation: z.string().optional(),
})

export const venteRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { sessionId } = request.query as { sessionId?: string }
    return app.db.vente.findMany({
      where: { tenantId, ...(sessionId && { sessionId }) },
      include: {
        lignes: {
          include: { article: { select: { id: true, nom: true, reference: true } } },
        },
      },
      orderBy: { dateVente: 'desc' },
    })
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateVenteSchema.parse(request.body)

    // Vérifier la session
    const session = await app.db.sessionCaisse.findFirst({
      where: { id: body.sessionId, tenantId, statut: 'OUVERTE' },
    })
    if (!session) return reply.notFound('Session de caisse introuvable ou fermée')

    // Récupérer les articles avec leur rayon (pour tauxTVA)
    const articleIds = body.lignes.map((l) => l.articleId)
    const articles = await app.db.article.findMany({
      where: { id: { in: articleIds }, tenantId },
      include: { rayon: { select: { tauxTVA: true } } },
    })

    if (articles.length !== articleIds.length) return reply.notFound('Un ou plusieurs articles introuvables')

    const articleMap = new Map(articles.map((a) => [a.id, a]))

    // Calculer les totaux
    let totalHT = 0, totalTVA = 0, totalTTC = 0

    const lignesData = body.lignes.map((l) => {
      const article = articleMap.get(l.articleId)!
      const prixHT  = Number(article.prixVenteHT)
      const taux    = Number(article.rayon.tauxTVA) / 100
      const ligneHT  = prixHT * l.quantite
      const ligneTTC = ligneHT * (1 + taux)
      totalHT  += ligneHT
      totalTVA += ligneTTC - ligneHT
      totalTTC += ligneTTC
      return {
        id:             crypto.randomUUID(),
        articleId:      l.articleId,
        quantite:       l.quantite,
        prixUnitaireHT: prixHT,
        tauxTVA:        Number(article.rayon.tauxTVA),
        totalLigneHT:   Math.round(ligneHT  * 100) / 100,
        totalLigneTTC:  Math.round(ligneTTC * 100) / 100,
      }
    })

    // Transaction : créer la vente + débit stock
    const vente = await app.db.$transaction(async (tx) => {
      const agg = await tx.vente.aggregate({
        where: { tenantId }, _max: { numero: true },
      })
      const numero = (agg._max.numero ?? 0) + 1

      const created = await tx.vente.create({
        data: {
          id:          body.id,
          tenantId,
          sessionId:   body.sessionId,
          numero,
          modePaiement: body.modePaiement,
          totalHT:     Math.round(totalHT  * 100) / 100,
          totalTVA:    Math.round(totalTVA * 100) / 100,
          totalTTC:    Math.round(totalTTC * 100) / 100,
          lignes: { create: lignesData },
        },
        include: {
          lignes: { include: { article: { select: { id: true, nom: true } } } },
        },
      })

      // Débit stock (uniquement si debiterStockME = true)
      if (session.debiterStockME) {
        for (const l of body.lignes) {
          await tx.article.update({
            where: { id: l.articleId },
            data:  { stock: { decrement: l.quantite } },
          })
        }
      }

      return created
    })

    return reply.status(201).send(vente)
  })

  app.patch('/:id/annuler', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { noteAnnulation } = AnnulerSchema.parse(request.body)

    const existing = await app.db.vente.findFirst({
      where: { id, tenantId },
      include: { session: true, lignes: true },
    })
    if (!existing) return reply.notFound()
    if (existing.statut === 'ANNULEE') return reply.badRequest('Vente déjà annulée')

    // Annulation + remise en stock dans une transaction
    const updated = await app.db.$transaction(async (tx) => {
      const v = await tx.vente.update({
        where: { id },
        data:  { statut: 'ANNULEE', noteAnnulation },
        include: { lignes: { include: { article: { select: { id: true, nom: true } } } } },
      })

      if (existing.session.debiterStockME) {
        for (const l of existing.lignes) {
          await tx.article.update({
            where: { id: l.articleId },
            data:  { stock: { increment: l.quantite } },
          })
        }
      }

      return v
    })

    return updated
  })
}
