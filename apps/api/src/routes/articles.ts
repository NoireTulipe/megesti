import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const CreateArticleSchema = z.object({
  id:              z.string().uuid(),
  rayonId:         z.string().uuid(),
  categorieId:     z.string().uuid().optional().nullable(),
  nom:             z.string().min(1),
  reference:       z.string().optional().nullable(),
  description:     z.string().optional().nullable(),
  imageUrl:        z.string().regex(/^(https?:\/\/|\/uploads\/)/, 'URL absolue ou chemin /uploads/ attendu').optional().nullable().or(z.literal('')).transform((v) => v || null),
  prixVenteHT:     z.number().nonnegative(),
  prixAchatHT:     z.number().nonnegative().optional().nullable(),
  prixAchatLotHT:  z.number().nonnegative().optional().nullable(),
  prixAchatLotQte: z.number().int().positive().optional().nullable(),
  stock:           z.number().int().nonnegative().default(0),
  stockAlerte:     z.number().int().nonnegative().default(0),
  stockTension:    z.number().int().nonnegative().default(0),
  isbn:            z.string().optional().nullable(),
  datePublication: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  auteurIds:       z.array(z.string().uuid()).default([]),
  imprimeurId:     z.string().uuid().optional().nullable(),
})

const PatchArticleSchema = z.object({
  rayonId:         z.string().uuid().optional(),
  categorieId:     z.string().uuid().optional().nullable(),
  nom:             z.string().min(1).optional(),
  reference:       z.string().optional().nullable(),
  description:     z.string().optional().nullable(),
  imageUrl:        z.string().regex(/^(https?:\/\/|\/uploads\/)/, 'URL absolue ou chemin /uploads/ attendu').optional().nullable().or(z.literal('')).transform((v) => v === undefined ? undefined : v || null),
  prixVenteHT:     z.number().nonnegative().optional(),
  prixAchatHT:     z.number().nonnegative().optional().nullable(),
  prixAchatLotHT:  z.number().nonnegative().optional().nullable(),
  prixAchatLotQte: z.number().int().positive().optional().nullable(),
  stock:           z.number().int().nonnegative().optional(),
  stockAlerte:     z.number().int().nonnegative().optional(),
  stockTension:    z.number().int().nonnegative().optional(),
  isbn:            z.string().optional().nullable(),
  datePublication: z.string().optional().nullable().transform((v) => v === undefined ? undefined : v ? new Date(v) : null),
  auteurIds:       z.array(z.string().uuid()).optional(),
  imprimeurId:     z.string().uuid().optional().nullable(),
  actif:           z.boolean().optional(),
})

const ListQuerySchema = z.object({
  q:           z.string().optional(),
  rayonId:     z.string().uuid().optional(),
  categorieId: z.string().uuid().optional(),
  actif:       z.enum(['true', 'false']).optional(),
  take:        z.coerce.number().int().positive().max(1000).optional(),
})

const ARTICLE_INCLUDE = {
  rayon:     true,
  categorie: true,
  imprimeur: { select: { id: true, nom: true, lienCommande: true } },
  auteurs: {
    include: { auteur: { select: { id: true, prenom: true, nom: true, pseudonyme: true } } },
    orderBy: { ordre: 'asc' as const },
  },
}

export const articleRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q, rayonId, categorieId, actif, take } = ListQuerySchema.parse(request.query)

    return app.db.article.findMany({
      where: {
        tenantId,
        actif:       actif !== undefined ? actif === 'true' : true,
        ...(rayonId     && { rayonId }),
        ...(categorieId && { categorieId }),
        ...(q           && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include: ARTICLE_INCLUDE,
      orderBy: { nom: 'asc' },
      ...(take && { take }),
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const article = await app.db.article.findFirst({
      where:   { id, tenantId },
      include: ARTICLE_INCLUDE,
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
      } as any,
      include: ARTICLE_INCLUDE,
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
        include: ARTICLE_INCLUDE,
      })
    })
  })

  // ── Upload image — génère thumb_app (150×200) et thumb_web (300×400) ──
  app.post('/:id/image', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const existing = await app.db.article.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    const data = await request.file()
    if (!data) return reply.badRequest('Aucun fichier reçu')

    const buffer = await data.toBuffer()

    const uploadDir = path.join(
      process.env['UPLOAD_DIR'] ?? path.join(process.cwd(), 'uploads'),
      'articles', id,
    )
    await mkdir(uploadDir, { recursive: true })

    await Promise.all([
      sharp(buffer)
        .resize(150, 200, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(path.join(uploadDir, 'thumb_app.jpg')),
      sharp(buffer)
        .resize(300, 400, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(path.join(uploadDir, 'thumb_web.jpg')),
    ])

    const thumbWebUrl = `/uploads/articles/${id}/thumb_web.jpg`

    // On stocke le thumb_web dans imageUrl (utilisé par le web SaaS)
    await app.db.article.update({
      where: { id },
      data:  { imageUrl: thumbWebUrl },
    })

    return {
      thumbAppUrl: `/uploads/articles/${id}/thumb_app.jpg`,
      thumbWebUrl,
    }
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
