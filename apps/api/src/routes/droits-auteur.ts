import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { calculerSoldeContrat, prochaineDateVersement } from '../services/droitsAuteur.js'

const CreatePaiementSchema = z.object({
  id:               z.string().uuid(),
  contratId:        z.string().uuid(),
  montant:          z.number().positive(),
  dateVersement:    z.string().datetime(),
  dateDebutPeriode: z.string().datetime(),
  dateFinPeriode:   z.string().datetime(),
  modePaiement:     z.enum(['VIREMENT', 'CHEQUE']).optional(),
  reference:        z.string().optional(),
  notes:            z.string().optional(),
})

const PatchPaiementSchema = z.object({
  statut:        z.enum(['PREVU', 'PAYE', 'ANNULE']).optional(),
  montant:       z.number().positive().optional(),
  dateVersement: z.string().datetime().optional(),
  modePaiement:  z.enum(['VIREMENT', 'CHEQUE']).optional(),
  reference:     z.string().optional(),
  notes:         z.string().optional(),
})

export const droitsAuteurRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR'), app.requireFeature('droitsAuteur')] }

  // ── Tableau de bord : tous les contrats actifs avec solde calculé ──
  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const contrats = await app.db.contratAuteur.findMany({
      where:   { tenantId, actif: true },
      select:  { id: true },
      orderBy: { createdAt: 'desc' },
    })

    const soldes = await Promise.all(
      contrats.map((c) => calculerSoldeContrat(c.id, tenantId, app.db as any))
    )
    return soldes.filter(Boolean)
  })

  // ── Calendrier : échéances dans les 90 prochains jours ──
  app.get('/calendrier', auth, async (request) => {
    const { tenantId } = request.tenant
    const horizon = new Date()
    horizon.setDate(horizon.getDate() + 90)

    const contrats = await app.db.contratAuteur.findMany({
      where: {
        tenantId,
        actif:            true,
        prochainVersement: { lte: horizon },
        periodicite:      { not: null },
      },
      include: {
        auteur:  { select: { id: true, prenom: true, nom: true } },
        article: { select: { id: true, nom: true } },
        typeDA:  { select: { nom: true } },
      },
      orderBy: { prochainVersement: 'asc' },
    })

    const result = await Promise.all(
      contrats.map(async (c) => {
        const solde = await calculerSoldeContrat(c.id, tenantId, app.db as any)
        return {
          contratId:         c.id,
          auteur:            c.auteur,
          article:           c.article,
          typeDA:            c.typeDA.nom,
          periodicite:       c.periodicite,
          prochainVersement: c.prochainVersement,
          solde:             solde?.solde ?? 0,
        }
      })
    )
    return result
  })

  // ── Historique des paiements ──
  app.get('/historique', auth, async (request) => {
    const { tenantId } = request.tenant
    const { auteurId } = request.query as { auteurId?: string }

    return app.db.paiementDA.findMany({
      where: {
        tenantId,
        ...(auteurId && { auteurId }),
      },
      include: {
        auteur:  { select: { id: true, prenom: true, nom: true } },
        contrat: { select: { id: true, article: { select: { id: true, nom: true } } } },
      },
      orderBy: { dateVersement: 'desc' },
    })
  })

  // ── Stats par auteur ──
  app.get('/stats', auth, async (request) => {
    const { tenantId } = request.tenant

    const paiements = await app.db.paiementDA.findMany({
      where:  { tenantId, statut: 'PAYE' },
      select: { auteurId: true, montant: true, auteur: { select: { id: true, prenom: true, nom: true } } },
    })

    const byAuteur = new Map<string, { auteur: { id: string; prenom: string; nom: string }; total: number }>()
    for (const p of paiements) {
      const cur = byAuteur.get(p.auteurId) ?? { auteur: p.auteur, total: 0 }
      byAuteur.set(p.auteurId, { ...cur, total: Math.round((cur.total + Number(p.montant)) * 100) / 100 })
    }

    return Array.from(byAuteur.values()).sort((a, b) => b.total - a.total)
  })

  // ── Alertes légères (sans calcul de solde) pour le dashboard ──
  app.get('/alertes', auth, async (request) => {
    const { tenantId } = request.tenant
    const maintenant   = new Date()
    const dans7jours   = new Date(maintenant.getTime() + 7 * 86400000)

    const contrats = await app.db.contratAuteur.findMany({
      where: {
        tenantId,
        actif:             true,
        prochainVersement: { not: null },
        periodicite:       { not: null },
      },
      select: {
        id:                true,
        prochainVersement: true,
        auteur:  { select: { id: true, prenom: true, nom: true } },
        article: { select: { id: true, nom: true } },
      },
      orderBy: { prochainVersement: 'asc' },
    })

    const retard  = contrats.filter((c) => c.prochainVersement! < maintenant)
    const bientot = contrats.filter((c) => {
      const pv = c.prochainVersement!
      return pv >= maintenant && pv <= dans7jours
    })

    return { retard, bientot }
  })

  // ── Solde d'un contrat précis ──
  app.get('/contrats/:contratId/solde', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { contratId } = request.params as { contratId: string }
    const solde = await calculerSoldeContrat(contratId, tenantId, app.db as any)
    if (!solde) return reply.notFound()
    return solde
  })

  // ── Enregistrer un paiement ──
  app.post('/paiements', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreatePaiementSchema.parse(request.body)

    const contrat = await app.db.contratAuteur.findFirst({
      where: { id: body.contratId, tenantId },
    })
    if (!contrat) return reply.notFound('Contrat introuvable')

    const paiement = await app.db.paiementDA.create({
      data: {
        id:               body.id,
        tenantId,
        contratId:        body.contratId,
        auteurId:         contrat.auteurId,
        montant:          body.montant,
        dateVersement:    new Date(body.dateVersement),
        dateDebutPeriode: new Date(body.dateDebutPeriode),
        dateFinPeriode:   new Date(body.dateFinPeriode),
        statut:           'PREVU',
        modePaiement:     body.modePaiement ?? null,
        reference:        body.reference ?? null,
        notes:            body.notes ?? null,
      },
      include: { auteur: { select: { id: true, prenom: true, nom: true } } },
    })

    // prochainVersement reste figé jusqu'au paiement effectif (PAYE).
    // L'avancement se fait dans le PATCH ci-dessous.

    return reply.status(201).send(paiement)
  })

  // ── Mettre à jour un paiement (marquer PAYE, ANNULE…) ──
  app.patch('/paiements/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchPaiementSchema.parse(request.body)

    const existing = await app.db.paiementDA.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    const updated = await app.db.paiementDA.update({
      where: { id },
      data: {
        ...body,
        ...(body.dateVersement ? { dateVersement: new Date(body.dateVersement) } : {}),
      },
    })

    // Avancer prochainVersement uniquement au moment du paiement effectif.
    // Tant que le paiement est PREVU (même en retard), la date d'échéance reste figée.
    if (body.statut === 'PAYE') {
      const contrat = await app.db.contratAuteur.findFirst({
        where: { id: existing.contratId, tenantId },
      })
      if (contrat?.periodicite) {
        const dateBase  = body.dateVersement ? new Date(body.dateVersement) : existing.dateVersement
        const prochaine = prochaineDateVersement(contrat.periodicite, contrat.datesFixesJSON, dateBase)
        await app.db.contratAuteur.update({
          where: { id: contrat.id },
          data:  { prochainVersement: prochaine },
        })
      }
    }

    return updated
  })

  // ── Appliquer la périodicité d'un contrat à tous les contrats de l'auteur ──
  app.post('/contrats/:contratId/appliquer-periodicite', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { contratId } = request.params as { contratId: string }

    const source = await app.db.contratAuteur.findFirst({
      where: { id: contratId, tenantId },
    })
    if (!source) return reply.notFound()
    if (!source.periodicite) return reply.badRequest('Ce contrat n\'a pas de périodicité définie')

    const { count } = await app.db.contratAuteur.updateMany({
      where: { tenantId, auteurId: source.auteurId, actif: true, id: { not: contratId } },
      data:  {
        periodicite:       source.periodicite,
        datesFixesJSON:    source.datesFixesJSON ?? Prisma.DbNull,
        prochainVersement: source.prochainVersement,
      },
    })

    return { updated: count }
  })
}
