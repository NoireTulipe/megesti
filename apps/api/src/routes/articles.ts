import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateArticleSchema = z.object({
  id:              z.string().uuid(),
  rayonId:         z.string().uuid(),
  categorieId:     z.string().uuid().optional().nullable(),
  nom:             z.string().min(1),
  reference:       z.string().optional().nullable(),
  description:     z.string().optional().nullable(),
  imageUrl:        z.string().url().optional().nullable().or(z.literal('')).transform((v) => v || null),
  prixVenteHT:     z.number().nonnegative(),
  prixAchatHT:     z.number().nonnegative().optional().nullable(),
  prixAchatLotHT:  z.number().nonnegative().optional().nullable(),
  prixAchatLotQte: z.number().int().positive().optional().nullable(),
  stock:           z.number().int().nonnegative().default(0),
  stockAlerte:     z.number().int().nonnegative().default(0),
  stockTension:    z.number().int().nonnegative().default(0),
  // Champs librairie
  isbn:            z.string().optional().nullable(),
  datePublication: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  auteurIds:       z.array(z.string().uuid()).default([]),
})

const PatchArticleSchema = CreateArticleSchema.omit({ id: true }).partial()

const ListQuerySchema = z.object({
  q:          z.string().optional(),
  rayonId:    z.string().uuid().optional(),
  categorieId: z.string().uuid().optional(),
  actif:      z.enum(['true', 'false']).optional(),
})

export const articleRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q, rayonId, categorieId, actif } = ListQuerySchema.parse(request.query)

    return app.db.article.findMany({
      where: {
        tenantId,
        actif:      actif !== undefined ? actif === 'true' : true,
        ...(rayonId     && { rayonId }),
        ...(categorieId && { categorieId }),
        ...(q           && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include: {
        rayon:     true,
        categorie: true,
        auteurs: {
          include: { auteur: { select: { id: true, prenom: true, nom: true, pseudonyme: true } } },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const article = await app.db.article.findFirst({
      where:   { id, tenantId },
      include: {
        rayon: true, categorie: true,
        auteurs: { include: { auteur: true }, orderBy: { ordre: 'asc' } },
      },
    })
    if (!article) return reply.notFound()
    return article
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { auteurIds, ...rest } = CreateArticleSchema.parse(request.body)
    const article = await app.db.article.create({
      data: {
        ...rest,
        tenantId,
        auteurs: { create: auteurIds.map((auteurId, ordre) => ({ auteurId, ordre })) },
      },
      include: {
        rayon: true, categorie: true,
        auteurs: { include: { auteur: true }, orderBy: { ordre: 'asc' } },
      },
    })
    return reply.status(201).send(article)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { auteurIds, ...rest } = PatchArticleSchema.parse(request.body)
    const existing = await app.db.article.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.$transaction(async (tx) => {
      if (auteurIds !== undefined) {
        await tx.articleAuteur.deleteMany({ where: { articleId: id } })
        if (auteurIds.length > 0) {
          await tx.articleAuteur.createMany({
            data: auteurIds.map((auteurId, ordre) => ({ auteurId, articleId: id, ordre })),
          })
        }
      }
      return tx.article.update({
        where: { id },
        data:  rest,
        include: {
          rayon: true, categorie: true,
          auteurs: { include: { auteur: true }, orderBy: { ordre: 'asc' } },
        },
      })
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.article.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.article.update({ where: { id }, data: { actif: false } })
    return reply.status(204).send()
  })
}
