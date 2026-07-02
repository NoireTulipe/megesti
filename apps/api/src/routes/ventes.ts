import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { verifyChain } from '@megesti/business'
import { creerVente, caisseSecret } from '../services/venteService.js'

const LigneSchema = z.object({
  articleId:      z.string().uuid(),
  quantite:       z.number().int().positive(),
  prixUnitaireHT: z.number().positive().optional(),
})

// Vente en session (sessionId requis)
const CreateVenteSessionSchema = z.object({
  id:           z.string().uuid(),
  sessionId:    z.string().uuid(),
  motifVenteId: z.undefined().optional(),
  modePaiement: z.enum(['CB', 'ESPECES', 'CHEQUE', 'VIREMENT', 'SUMUP', 'PDV']),
  lignes:       z.array(LigneSchema).min(1),
})

// Vente hors session (motifVenteId requis, pas de sessionId)
const CreateVenteHorsSessionSchema = z.object({
  id:           z.string().uuid(),
  sessionId:    z.null().optional(),
  motifVenteId: z.string().uuid(),
  modePaiement: z.enum(['CB', 'ESPECES', 'CHEQUE', 'VIREMENT', 'SUMUP']),
  lignes:       z.array(LigneSchema).min(1),
})

const CreateVenteSchema = z.union([CreateVenteSessionSchema, CreateVenteHorsSessionSchema])

const AnnulerSchema = z.object({
  noteAnnulation: z.string().optional(),
})

export const venteRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { sessionId, horsSession, auteurId } = request.query as { sessionId?: string; horsSession?: string; auteurId?: string }
    return app.db.vente.findMany({
      where: {
        tenantId,
        ...(sessionId   && { sessionId }),
        ...(horsSession === 'true' && { sessionId: null, auteurId: null }),
        ...(auteurId    && { auteurId }),
      },
      include: {
        lignes:      { include: { article: { select: { id: true, nom: true, reference: true } } } },
        motifVente:  { select: { id: true, libelle: true } },
      },
      orderBy: { dateVente: 'desc' },
    })
  })

  // ── Vente d'exemplaires auteur ────────────────────────────────────────────────
  const ExemplaireAuteurSchema = z.object({
    id:           z.string().uuid(),
    auteurId:     z.string().uuid(),
    modePaiement: z.enum(['CB', 'ESPECES', 'CHEQUE', 'VIREMENT', 'SUMUP']),
    lignes:       z.array(LigneSchema).min(1),
  })

  app.post('/exemplaires-auteur', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = ExemplaireAuteurSchema.parse(request.body)

    const auteur = await app.db.auteur.findFirst({ where: { id: body.auteurId, tenantId } })
    if (!auteur) return reply.notFound('Auteur introuvable')

    const vente = await creerVente(app.db, {
      id:           body.id,
      tenantId,
      auteurId:     body.auteurId,
      modePaiement: body.modePaiement,
      lignes:       body.lignes,
      debiterStock: true,
    })

    return reply.status(201).send(vente)
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateVenteSchema.parse(request.body)

    // Résolution session ou motif
    let debiterStock = true
    if (body.sessionId) {
      const session = await app.db.sessionCaisse.findFirst({
        where: { id: body.sessionId, tenantId, statut: 'OUVERTE' },
      })
      if (!session) return reply.notFound('Session de caisse introuvable ou fermée')
      debiterStock = session.debiterStockME
    } else {
      const motif = await app.db.motifVente.findFirst({
        where: { id: body.motifVenteId, tenantId, actif: true },
      })
      if (!motif) return reply.notFound('Motif de vente introuvable')
    }

    const vente = await creerVente(app.db, {
      id:           body.id,
      tenantId,
      sessionId:    body.sessionId    ?? null,
      motifVenteId: body.motifVenteId ?? null,
      modePaiement: body.modePaiement,
      lignes:       body.lignes,
      debiterStock,
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

    // Miroir exact de la logique de débit à la création : en session on suit
    // debiterStockME, hors session et exemplaires auteur débitent toujours.
    const stockDebite = existing.session ? existing.session.debiterStockME : true

    const updated = await app.db.$transaction(async (tx) => {
      const v = await tx.vente.update({
        where: { id },
        data:  { statut: 'ANNULEE', noteAnnulation: noteAnnulation ?? null },
        include: { lignes: { include: { article: { select: { id: true, nom: true } } } } },
      })
      if (stockDebite) {
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

    const forVerification = ventes.flatMap((v) =>
      v.hash && v.previousHash ? [{
        ...v,
        hash:         v.hash,
        previousHash: v.previousHash,
        totalHT:      Number(v.totalHT),
        totalTVA:     Number(v.totalTVA),
        totalTTC:     Number(v.totalTTC),
      }] : []
    )

    return verifyChain(forVerification, tenantId, caisseSecret)
  })
}
