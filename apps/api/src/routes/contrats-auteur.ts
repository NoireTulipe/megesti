import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { evaluateDA, calculateRoyalties } from '@megesti/business'
import type { FormuleDA, ContexteVente } from '@megesti/business'

const CreateSchema = z.object({
  id:        z.string().uuid(),
  auteurId:  z.string().uuid(),
  typeDAId:  z.string().uuid(),
  articleId: z.string().uuid().optional(),
  avance:    z.number().nonnegative().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin:   z.string().datetime().optional(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

const SimulerSchema = z.object({
  lignes: z.array(z.object({
    articleId:     z.string().uuid(),
    quantite:      z.number().int().positive(),
    totalLigneHT:  z.number().nonnegative(),
    totalLigneTTC: z.number().nonnegative(),
  })).min(1),
  contexte: z.object({
    vendeur:        z.enum(['AUTEUR', 'ME']),
    avecCommission: z.boolean(),
    typeVente:      z.enum(['DIRECTE', 'DEPOT', 'SALON']).optional(),
  }),
})

export const contratAuteurRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { auteurId } = request.query as { auteurId?: string }
    return app.db.contratAuteur.findMany({
      where:   { tenantId, actif: true, ...(auteurId && { auteurId }) },
      include: { typeDA: true, auteur: { select: { id: true, prenom: true, nom: true } }, article: { select: { id: true, nom: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { avance, dateDebut, dateFin, ...rest } = CreateSchema.parse(request.body)

    const [auteur, typeDA] = await Promise.all([
      app.db.auteur.findFirst({ where: { id: rest.auteurId, tenantId } }),
      app.db.typeDA.findFirst({ where: { id: rest.typeDAId, tenantId } }),
    ])
    if (!auteur) return reply.notFound('Auteur introuvable')
    if (!typeDA) return reply.notFound('Barème DA introuvable')

    return reply.status(201).send(
      await app.db.contratAuteur.create({
        data: {
          ...rest,
          tenantId,
          avance:    avance ?? null,
          avanceDue: 0,
          dateDebut: dateDebut ? new Date(dateDebut) : null,
          dateFin:   dateFin   ? new Date(dateFin)   : null,
        },
        include: { typeDA: true },
      })
    )
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { avance, dateDebut, dateFin, ...rest } = PatchSchema.parse(request.body)
    const existing = await app.db.contratAuteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.contratAuteur.update({
      where: { id },
      data: {
        ...rest,
        ...(avance    !== undefined ? { avance:    avance ?? null }     : {}),
        ...(dateDebut !== undefined ? { dateDebut: dateDebut ? new Date(dateDebut) : null } : {}),
        ...(dateFin   !== undefined ? { dateFin:   dateFin   ? new Date(dateFin)   : null } : {}),
      },
      include: { typeDA: true },
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.contratAuteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.contratAuteur.update({ where: { id }, data: { actif: false } })
    return reply.status(204).send()
  })

  // Simuler un calcul de droits sans persister
  app.post('/:id/simuler', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { lignes, contexte } = SimulerSchema.parse(request.body)

    const contrat = await app.db.contratAuteur.findFirst({
      where:   { id, tenantId },
      include: { typeDA: true },
    })
    if (!contrat) return reply.notFound()

    const formule = contrat.typeDA.formule as unknown as FormuleDA
    const avanceTotal = Number(contrat.avance ?? 0)
    const avanceDue   = Number(contrat.avanceDue)

    return calculateRoyalties(lignes, formule, contexte as ContexteVente, avanceDue, avanceTotal)
  })
}
