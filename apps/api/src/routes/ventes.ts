import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { computeGenesisHash, computeVenteHash, verifyChain } from '@megesti/business'

const secret: string = process.env['CAISSE_SECRET'] ?? (() => { throw new Error('CAISSE_SECRET manquant') })()

const LigneSchema = z.object({
  articleId:      z.string().uuid(),
  quantite:       z.number().int().positive(),
  prixUnitaireHT: z.number().positive().optional(),
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
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

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

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateVenteSchema.parse(request.body)

    const session = await app.db.sessionCaisse.findFirst({
      where: { id: body.sessionId, tenantId, statut: 'OUVERTE' },
    })
    if (!session) return reply.notFound('Session de caisse introuvable ou fermée')

    const articleIds = body.lignes.map((l) => l.articleId)
    const articles = await app.db.article.findMany({
      where: { id: { in: articleIds }, tenantId },
      include: { rayon: { select: { tauxTVA: true } } },
    })
    if (articles.length !== articleIds.length) return reply.notFound('Un ou plusieurs articles introuvables')

    const articleMap = new Map(articles.map((a) => [a.id, a]))

    let totalHT = 0, totalTVA = 0, totalTTC = 0
    const lignesData = body.lignes.map((l) => {
      const article = articleMap.get(l.articleId)!
      const prixHT  = l.prixUnitaireHT ?? Number(article.prixVenteHT)
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

    const totalHTr  = Math.round(totalHT  * 100) / 100
    const totalTVAr = Math.round(totalTVA * 100) / 100
    const totalTTCr = Math.round(totalTTC * 100) / 100

    const vente = await app.db.$transaction(async (tx) => {
      const agg = await tx.vente.aggregate({ where: { tenantId }, _max: { numero: true } })
      const numero = (agg._max.numero ?? 0) + 1

      const lastVente = await tx.vente.findFirst({
        where: { tenantId, hash: { not: null } },
        orderBy: { numero: 'desc' },
        select: { hash: true },
      })
      const previousHash = lastVente?.hash ?? computeGenesisHash(tenantId, secret)

      const dateVente = new Date()
      const hash = computeVenteHash(previousHash, {
        id: body.id, numero, tenantId, sessionId: body.sessionId,
        dateVente, modePaiement: body.modePaiement,
        totalHT: totalHTr, totalTVA: totalTVAr, totalTTC: totalTTCr,
      }, secret)

      const created = await tx.vente.create({
        data: {
          id: body.id, tenantId, sessionId: body.sessionId,
          numero, dateVente, modePaiement: body.modePaiement,
          totalHT: totalHTr, totalTVA: totalTVAr, totalTTC: totalTTCr,
          previousHash, hash,
          lignes: { create: lignesData },
        },
        include: { lignes: { include: { article: { select: { id: true, nom: true } } } } },
      })

      if (session.debiterStockME) {
        for (const l of body.lignes) {
          await tx.article.update({ where: { id: l.articleId }, data: { stock: { decrement: l.quantite } } })
        }
      }

      return created
    })

    return reply.status(201).send(vente)
  })

  app.patch('/:id/annuler', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { noteAnnulation } = AnnulerSchema.parse(request.body)

    const existing = await app.db.vente.findFirst({
      where: { id, tenantId },
      include: { session: true, lignes: true },
    })
    if (!existing) return reply.notFound()
    if (existing.statut === 'ANNULEE') return reply.badRequest('Vente déjà annulée')

    const updated = await app.db.$transaction(async (tx) => {
      const v = await tx.vente.update({
        where: { id },
        data:  { statut: 'ANNULEE', noteAnnulation: noteAnnulation ?? null },
        include: { lignes: { include: { article: { select: { id: true, nom: true } } } } },
      })
      if (existing.session.debiterStockME) {
        for (const l of existing.lignes) {
          await tx.article.update({ where: { id: l.articleId }, data: { stock: { increment: l.quantite } } })
        }
      }
      return v
    })

    return updated
  })

  app.get('/verify-integrity', {
    preHandler: [app.authenticate, app.requireRole('ADMIN')],
  }, async (request) => {
    const { tenantId } = request.tenant

    const ventes = await app.db.vente.findMany({
      where: { tenantId, hash: { not: null }, previousHash: { not: null } },
      orderBy: { numero: 'asc' },
      select: {
        id: true, numero: true, tenantId: true, sessionId: true,
        dateVente: true, modePaiement: true,
        totalHT: true, totalTVA: true, totalTTC: true,
        hash: true, previousHash: true,
      },
    })

    const forVerification = ventes.map((v) => ({
      ...v,
      hash:         v.hash!,
      previousHash: v.previousHash!,
      totalHT:      Number(v.totalHT),
      totalTVA:     Number(v.totalTVA),
      totalTTC:     Number(v.totalTTC),
    }))

    return verifyChain(forVerification, tenantId, secret)
  })
}
