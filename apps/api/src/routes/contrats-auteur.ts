import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { evaluateDA, calculateRoyalties } from '@megesti/business'
import type { FormuleDA, ContexteVente } from '@megesti/business'
import { prochaineDateVersement } from '../services/droitsAuteur.js'

const DateFixeSchema = z.object({ mois: z.number().int().min(1).max(12), jour: z.number().int().min(1).max(31) })
const PeriodiciteSchema = z.enum(['MENSUEL','TRIMESTRIEL','TOUS_LES_4_MOIS','SEMESTRIEL','ANNUEL','DATES_FIXES'])

const CreateSchema = z.object({
  id:                z.string().uuid(),
  auteurId:          z.string().uuid(),
  typeDAId:          z.string().uuid(),
  articleId:         z.string().uuid().optional(),
  avance:            z.number().nonnegative().optional(),
  dateSignature:     z.string().datetime().optional(),
  datePriseEffet:    z.string().datetime().optional(),
  dureeAns:          z.number().int().positive().optional(),
  reconduiteTacite:  z.boolean().default(true),
  periodicite:       PeriodiciteSchema.optional().nullable(),
  datesFixesJSON:    z.array(DateFixeSchema).optional().nullable(),
  prochainVersement: z.string().datetime().optional().nullable(),
})

const PatchSchema = z.object({
  typeDAId:          z.string().uuid().optional(),
  articleId:         z.string().uuid().nullable().optional(),
  avance:            z.number().nonnegative().nullable().optional(),
  dateSignature:     z.string().datetime().optional(),
  datePriseEffet:    z.string().datetime().optional(),
  dureeAns:          z.number().int().positive().nullable().optional(),
  reconduiteTacite:  z.boolean().optional(),
  periodicite:       PeriodiciteSchema.nullable().optional(),
  datesFixesJSON:    z.array(DateFixeSchema).nullable().optional(),
  prochainVersement: z.string().datetime().nullable().optional(),
})

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
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR'), app.requireFeature('contratsAuteurs')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN'),            app.requireFeature('contratsAuteurs')] }

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
    const { avance, dateSignature, datePriseEffet, ...rest } = CreateSchema.parse(request.body)

    const [auteur, typeDA] = await Promise.all([
      app.db.auteur.findFirst({ where: { id: rest.auteurId, tenantId } }),
      app.db.typeDA.findFirst({ where: { id: rest.typeDAId, tenantId } }),
    ])
    if (!auteur) return reply.notFound('Auteur introuvable')
    if (!typeDA) return reply.notFound('Barème DA introuvable')

    const sigDate = dateSignature ? new Date(dateSignature) : null
    const { periodicite, datesFixesJSON, prochainVersement, ...coreRest } = rest
    return reply.status(201).send(
      await app.db.contratAuteur.create({
        data: {
          ...coreRest,
          tenantId,
          avance:            avance ?? null,
          avanceDue:         0,
          dateSignature:     sigDate,
          datePriseEffet:    datePriseEffet ? new Date(datePriseEffet) : sigDate,
          periodicite:       periodicite ?? null,
          datesFixesJSON:    datesFixesJSON ?? Prisma.DbNull,
          prochainVersement: prochainVersement ? new Date(prochainVersement) : null,
        } as any,
        include: { typeDA: true },
      })
    )
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.contratAuteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    const parsed = PatchSchema.parse(request.body)
    const { avance, dateSignature, datePriseEffet, periodicite, datesFixesJSON, prochainVersement, ...rest } = parsed

    // ?? ne suffit pas : null doit écraser, undefined doit conserver
    const periodeEffective = periodicite  !== undefined ? periodicite  : existing.periodicite
    const datesEffectives  = datesFixesJSON !== undefined ? datesFixesJSON : existing.datesFixesJSON
    const pvManuel          = prochainVersement !== undefined ? prochainVersement : null
    const pvCalcule = (!pvManuel && periodeEffective)
      ? prochaineDateVersement(periodeEffective, datesEffectives)
      : (pvManuel ? new Date(pvManuel) : null)

    return app.db.contratAuteur.update({
      where: { id },
      data: {
        ...rest,
        ...(avance         !== undefined ? { avance:         avance ?? null }                                     : {}),
        ...(dateSignature  !== undefined ? { dateSignature:  dateSignature  ? new Date(dateSignature)  : null }   : {}),
        ...(datePriseEffet !== undefined ? { datePriseEffet: datePriseEffet ? new Date(datePriseEffet) : null }   : {}),
        ...(periodicite    !== undefined ? { periodicite:    periodicite ?? null }                                 : {}),
        ...(datesFixesJSON !== undefined ? { datesFixesJSON: datesFixesJSON ?? Prisma.DbNull }                    : {}),
        prochainVersement: pvCalcule,
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

    return calculateRoyalties(lignes as any, formule, contexte as ContexteVente, avanceDue, avanceTotal)
  })
}
