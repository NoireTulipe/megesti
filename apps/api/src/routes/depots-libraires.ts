import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

// ── Schémas ───────────────────────────────────────────────────────────────────

const ContactSchema = z.object({
  id:        z.string().uuid(),
  nom:       z.string().min(1),
  prenom:    z.string().optional(),
  email:     z.string().email().optional().or(z.literal('')),
  telephone: z.string().optional(),
})

const CreateSchema = z.object({
  id:                z.string().uuid(),
  nom:               z.string().min(1),
  adresse:           z.string().optional(),
  commissionFixe:    z.number().nonnegative().optional().nullable(),
  commissionPourcent:z.number().min(0).max(100).optional().nullable(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

const ArticleDepotSchema = z.object({
  id:              z.string().uuid(),
  articleId:       z.string().uuid(),
  quantiteEnvoyee: z.number().int().positive(),
  notes:           z.string().optional(),
})

const ConfirmerVenteSchema = z.object({
  articleDepotId: z.string().uuid(),
  quantite:       z.number().int().positive(),
})

// ── Route plugin ──────────────────────────────────────────────────────────────

export const depotLibraireRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  const withRelations = {
    include: {
      contacts: { orderBy: { nom: 'asc' as const } },
      articles: {
        where: { article: { actif: true } },
        include: { article: { select: { id: true, nom: true, isbn: true, prixVenteHT: true, stock: true } } },
        orderBy: { dateEnvoi: 'desc' as const },
      },
    },
  }

  // ── Liste ──────────────────────────────────────────────────────
  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.depotLibraire.findMany({
      where: { tenantId, actif: true, ...(q && { nom: { contains: q, mode: 'insensitive' } }) },
      include: {
        contacts: { select: { id: true } },
        articles: { select: { id: true, quantiteEnvoyee: true, quantiteVendue: true } },
      },
      orderBy: { nom: 'asc' },
    })
  })

  // ── Détail ─────────────────────────────────────────────────────
  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.depotLibraire.findFirst({ where: { id, tenantId }, ...withRelations })
    if (!rec) return reply.notFound()
    return rec
  })

  // ── Créer ──────────────────────────────────────────────────────
  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.depotLibraire.create({ data: { ...body, tenantId } as any, ...withRelations })
    )
  })

  // ── Modifier ───────────────────────────────────────────────────
  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.depotLibraire.update({ where: { id }, data: body, ...withRelations })
  })

  // ── Supprimer ──────────────────────────────────────────────────
  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.depotLibraire.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })

  // ── Contacts ───────────────────────────────────────────────────

  app.post('/:id/contacts', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = ContactSchema.parse(request.body)
    const depot = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!depot) return reply.notFound()
    return reply.status(201).send(
      await app.db.contactDepotLibraire.create({ data: { ...body, depotLibraireId: id } as any })
    )
  })

  app.patch('/:id/contacts/:contactId', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id, contactId } = request.params as { id: string; contactId: string }
    const body = ContactSchema.omit({ id: true }).partial().parse(request.body)
    const depot = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!depot) return reply.notFound()
    const contact = await app.db.contactDepotLibraire.findFirst({ where: { id: contactId, depotLibraireId: id } })
    if (!contact) return reply.notFound()
    return app.db.contactDepotLibraire.update({ where: { id: contactId }, data: body })
  })

  app.delete('/:id/contacts/:contactId', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id, contactId } = request.params as { id: string; contactId: string }
    const depot = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!depot) return reply.notFound()
    await app.db.contactDepotLibraire.deleteMany({ where: { id: contactId, depotLibraireId: id } })
    return reply.status(204).send()
  })

  // ── Stock en dépôt ─────────────────────────────────────────────

  // Envoyer des livres en dépôt
  app.post('/:id/articles', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = ArticleDepotSchema.parse(request.body)

    const depot   = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!depot) return reply.notFound()
    const article = await app.db.article.findFirst({ where: { id: body.articleId, tenantId } })
    if (!article) return reply.notFound('Article introuvable')
    if (article.stock < body.quantiteEnvoyee) return reply.badRequest('Stock insuffisant')

    // Sortie de stock + création ArticleDepot (transaction callback — plus robuste avec nouveaux modèles)
    const articleDepot = await app.db.$transaction(async (tx) => {
      const ad = await tx.articleDepot.create({
        data: { ...body, tenantId, depotLibraireId: id } as any,
        include: { article: { select: { id: true, nom: true, isbn: true, prixVenteHT: true, stock: true } } },
      })
      await tx.mouvementStock.create({
        data: {
          tenantId,
          articleId:  body.articleId,
          type:       'SORTIE_DON',
          delta:      -body.quantiteEnvoyee,
          stockAvant: article.stock,
          stockApres: article.stock - body.quantiteEnvoyee,
          motif:      `Envoi dépôt-vente — ${depot.nom}`,
        },
      })
      await tx.article.update({
        where: { id: body.articleId },
        data:  { stock: { decrement: body.quantiteEnvoyee } },
      })
      return ad
    })

    return reply.status(201).send(articleDepot)
  })

  // Supprimer un envoi (retour stock)
  app.delete('/:id/articles/:articleDepotId', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id, articleDepotId } = request.params as { id: string; articleDepotId: string }
    const ad = await app.db.articleDepot.findFirst({
      where: { id: articleDepotId, depotLibraireId: id, tenantId },
      include: { article: true },
    })
    if (!ad) return reply.notFound()
    const retour = ad.quantiteEnvoyee - ad.quantiteVendue
    await app.db.$transaction(async (tx) => {
      await tx.articleDepot.delete({ where: { id: articleDepotId } })
      if (retour > 0) {
        await tx.mouvementStock.create({
          data: {
            tenantId,
            articleId:  ad.articleId,
            type:       'ENTREE',
            delta:      retour,
            stockAvant: ad.article.stock,
            stockApres: ad.article.stock + retour,
            motif:      `Retour dépôt-vente — ${ad.depotLibraireId}`,
          },
        })
        await tx.article.update({
          where: { id: ad.articleId },
          data:  { stock: { increment: retour } },
        })
      }
    })
    return reply.status(204).send()
  })

  // ── Confirmer des ventes ───────────────────────────────────────

  app.post('/:id/confirmer-vente', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = ConfirmerVenteSchema.parse(request.body)

    const depot = await app.db.depotLibraire.findFirst({ where: { id, tenantId } })
    if (!depot) return reply.notFound()

    const ad = await app.db.articleDepot.findFirst({
      where:   { id: body.articleDepotId, depotLibraireId: id, tenantId },
      include: { article: { include: { rayon: { select: { tauxTVA: true } } } } },
    })
    if (!ad) return reply.notFound('Envoi introuvable')

    const restant = ad.quantiteEnvoyee - ad.quantiteVendue
    if (body.quantite > restant) return reply.badRequest(`Seulement ${restant} exemplaires disponibles`)

    // ── Calcul brut (TVA du rayon) ────────────────────────────────
    const prixHT    = Number(ad.article.prixVenteHT)
    const tauxTVA   = Number(ad.article.rayon.tauxTVA)      // ex. 5.5 pour les livres
    const totalHT   = Math.round(prixHT * body.quantite * 100) / 100
    const totalTVA  = Math.round(totalHT * tauxTVA / 100 * 100) / 100
    const totalTTC  = Math.round((totalHT + totalTVA) * 100) / 100

    // ── Commission ────────────────────────────────────────────────
    const commission = depot.commissionPourcent
      ? Math.round(totalHT * (Number(depot.commissionPourcent) / 100) * 100) / 100
      : Math.round(Number(depot.commissionFixe ?? 0) * 100) / 100

    // ── Transaction : vente brut + frais commission + mise à jour dépôt ──
    const numero = await app.db.vente.count({ where: { tenantId } }) + 1

    const vente = await app.db.$transaction(async (tx) => {
      // 1. Vente au PRIX BRUT → alimente le CA
      const v = await tx.vente.create({
        data: {
          tenantId,
          numero,
          modePaiement: 'VIREMENT',   // paiement attendu (différé)
          totalHT,
          totalTVA,
          totalTTC,
          statut: 'VALIDEE',
          lignes: {
            create: [{
              articleId:      ad.articleId,
              quantite:       body.quantite,
              prixUnitaireHT: prixHT,
              tauxTVA,
              totalLigneHT:   totalHT,
              totalLigneTTC:  totalTTC,
            }],
          },
        },
        include: { lignes: true },
      })

      // 2. Commission → sortie comptable (frais)
      if (commission > 0) {
        await tx.frais.create({
          data: {
            tenantId,
            type:      'AUTRE',
            motif:     `Commission dépôt-vente — ${depot.nom}`,
            montantHT: commission,
            date:      new Date(),
          },
        })
      }

      // 3. Mise à jour quantité vendue
      await tx.articleDepot.update({
        where: { id: ad.id },
        data:  { quantiteVendue: { increment: body.quantite } },
      })

      return v
    })

    return reply.status(201).send({
      vente,
      totalHT,
      totalTTC,
      commission,
      net: Math.round((totalHT - commission) * 100) / 100,
    })
  })
}
