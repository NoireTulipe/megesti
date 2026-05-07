import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateAuteurSchema = z.object({
  id:         z.string().uuid(),
  prenom:     z.string().min(1),
  nom:        z.string().min(1),
  pseudonyme: z.string().optional(),
  email:      z.string().email().optional(),
  bio:        z.string().optional(),
})

const PatchAuteurSchema = CreateAuteurSchema.omit({ id: true }).partial()

export const auteurRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q, avecContrat } = request.query as { q?: string; avecContrat?: string }

    const contratFilter =
      avecContrat === 'true'  ? { contrats: { some: { actif: true, tenantId } } } :
      avecContrat === 'false' ? { NOT: { contrats: { some: { actif: true, tenantId } } } } :
      {}

    return app.db.auteur.findMany({
      where: {
        tenantId,
        actif: true,
        ...contratFilter,
        ...(q && {
          OR: [
            { nom:    { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { contrats: { where: { actif: true } }, articles: true } } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const auteur = await app.db.auteur.findFirst({
      where: { id, tenantId },
      include: {
        _count:   { select: { contrats: { where: { actif: true } } } },
        articles: {
          include: {
            article: { select: { id: true, nom: true, isbn: true, stock: true, prixVenteHT: true } },
          },
          orderBy: { ordre: 'asc' },
        },
      },
    })
    if (!auteur) return reply.notFound()
    return auteur
  })

  app.get('/:id/ventes-stats', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id }       = request.params as { id: string }
    const { period = '12' } = request.query as { period?: string }

    const articleAuteurs = await app.db.articleAuteur.findMany({
      where:  { auteurId: id, article: { tenantId } },
      select: { articleId: true },
    })
    const articleIds = articleAuteurs.map((a) => a.articleId)
    if (!articleIds.length) return { months: [] }

    const periodMonths = Math.min(Math.max(Number(period) || 12, 1), 36)
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - periodMonths)

    const lignes = await app.db.ligneVente.findMany({
      where: {
        articleId: { in: articleIds },
        vente:     { tenantId, dateVente: { gte: cutoff }, statut: 'VALIDEE' },
      },
      select: {
        quantite:     true,
        totalLigneHT: true,
        vente:        { select: { dateVente: true } },
      },
    })

    const byMonth = new Map<string, { quantite: number; totalHT: number }>()
    for (const ligne of lignes) {
      const d   = new Date(ligne.vente.dateVente)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cur = byMonth.get(key) ?? { quantite: 0, totalHT: 0 }
      byMonth.set(key, {
        quantite: cur.quantite + ligne.quantite,
        totalHT:  cur.totalHT + Number(ligne.totalLigneHT),
      })
    }

    const months = []
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d   = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const data  = byMonth.get(key) ?? { quantite: 0, totalHT: 0 }
      months.push({ key, label, quantite: data.quantite, totalHT: Math.round(data.totalHT * 100) / 100 })
    }

    return { months }
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateAuteurSchema.parse(request.body)

    const auteur = await app.db.auteur.create({
      data: { ...body, tenantId } as any,
    })
    return reply.status(201).send(auteur)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchAuteurSchema.parse(request.body)

    const existing = await app.db.auteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.auteur.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.auteur.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
