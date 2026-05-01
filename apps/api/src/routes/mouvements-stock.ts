import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:        z.string().uuid(),
  articleId: z.string().uuid(),
  type:      z.enum(['ENTREE', 'SORTIE_DON', 'SORTIE_PERTE', 'SORTIE_VOL', 'SORTIE_DEGRADATION', 'AJUSTEMENT']),
  // Pour ENTREE et AJUSTEMENT : stockApres est la valeur cible
  // Pour les sorties : quantite est le nombre retiré (positif)
  quantite:    z.number().int().positive().optional(),  // nb unités retirées (sorties)
  stockCible:  z.number().int().nonnegative().optional(), // valeur absolue cible (AJUSTEMENT)
  motif:       z.string().optional(),
  montantHT:   z.number().nonnegative().optional(),      // pour créer un Frais associé
  creeFrais:   z.boolean().default(false),
})

export const mouvementStockRoutes: FastifyPluginAsync = async (app) => {
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  // Liste des mouvements (filtrable par article et période)
  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const { tenantId } = request.tenant
    const { articleId, from, to, period } = request.query as {
      articleId?: string; from?: string; to?: string; period?: string
    }

    let dateFrom: Date | undefined
    let dateTo:   Date | undefined
    if (from) { dateFrom = new Date(from); dateFrom.setHours(0,0,0,0) }
    if (to)   { dateTo   = new Date(to);   dateTo.setHours(23,59,59,999) }
    if (!dateFrom && period) {
      dateFrom = new Date()
      if (period === '7d')  dateFrom.setDate(dateFrom.getDate() - 7)
      if (period === '30d') dateFrom.setDate(dateFrom.getDate() - 30)
      if (period === '3m')  dateFrom.setMonth(dateFrom.getMonth() - 3)
      if (period === '12m') dateFrom.setFullYear(dateFrom.getFullYear() - 1)
      dateFrom.setHours(0,0,0,0)
    }

    const mvts = await app.db.mouvementStock.findMany({
      where: {
        tenantId,
        ...(articleId ? { articleId } : {}),
        ...(dateFrom || dateTo ? { createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo   ? { lte: dateTo   } : {}),
        }} : {}),
      },
      include: { article: { select: { id: true, nom: true, rayon: { select: { id: true, nom: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return mvts
  })

  // Créer un ajustement
  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)

    const article = await app.db.article.findFirst({ where: { id: body.articleId, tenantId } })
    if (!article) return reply.notFound()

    const stockAvant = article.stock
    let stockApres: number
    let delta: number

    if (body.type === 'AJUSTEMENT' || body.type === 'ENTREE') {
      if (body.stockCible === undefined) return reply.badRequest('stockCible requis pour ENTREE/AJUSTEMENT')
      stockApres = body.stockCible
      delta = stockApres - stockAvant
    } else {
      // Sortie : on retire `quantite` unités
      if (!body.quantite) return reply.badRequest('quantite requise pour les sorties')
      delta = -body.quantite
      stockApres = Math.max(0, stockAvant + delta)
    }

    const result = await app.db.$transaction(async (tx) => {
      // Mettre à jour le stock article
      await tx.article.update({ where: { id: body.articleId }, data: { stock: stockApres } })

      // Enregistrer le mouvement
      const mvt = await tx.mouvementStock.create({
        data: {
          id: body.id,
          tenantId,
          articleId: body.articleId,
          type:      body.type,
          delta,
          stockAvant,
          stockApres,
          motif:     body.motif,
        },
      })

      // Créer un Frais si demandé (don, perte, vol, dégradation)
      if (body.creeFrais && delta < 0) {
        const typeFrais = body.type === 'SORTIE_DON' ? 'DON' : 'PERTE_STOCK'
        await tx.frais.create({
          data: {
            id:        crypto.randomUUID(),
            tenantId,
            articleId: body.articleId,
            type:      typeFrais,
            motif:     body.motif ?? `Sortie stock : ${article.nom}`,
            montantHT: body.montantHT ?? null,
            date:      new Date(),
          },
        })
      }

      return mvt
    })

    return reply.status(201).send(result)
  })
}
