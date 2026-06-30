import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { calculateRoyalties } from '@megesti/business'
import type { FormuleDA, ContexteVente, LigneVenteDA } from '@megesti/business'

const OpenSchema = z.object({
  id:             z.string().uuid(),
  pointDeVenteId: z.string().uuid(),
  nom:            z.string().optional(),
  fondOuverture:  z.number().nonnegative().default(0),
  debiterStockME: z.boolean().default(true),
})

const CloseSchema = z.object({
  fondFermeture: z.number().nonnegative().optional(),
})

export const sessionCaisseRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { pointDeVenteId, statut } = request.query as { pointDeVenteId?: string; statut?: string }
    const sessions = await app.db.sessionCaisse.findMany({
      where: {
        tenantId,
        ...(pointDeVenteId && { pointDeVenteId }),
        ...(statut && { statut: statut as 'OUVERTE' | 'FERMEE' }),
      },
      include: {
        pointDeVente: { include: { categorie: true } },
        _count: { select: { ventes: true } },
      },
      orderBy: { dateOuverture: 'desc' },
    })

    if (sessions.length === 0) return sessions

    const caRows = await app.db.vente.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessions.map(s => s.id) }, statut: 'VALIDEE' },
      _sum: { totalTTC: true },
    })
    const caBySession = new Map(caRows.map(r => [r.sessionId, Number(r._sum.totalTTC ?? 0)]))

    return sessions.map(s => ({ ...s, _caSession: caBySession.get(s.id) ?? 0 }))
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.sessionCaisse.findFirst({
      where: { id, tenantId },
      include: {
        pointDeVente: { include: { categorie: true } },
        ventes: {
          include: { lignes: { include: { article: { select: { nom: true } } } } },
          orderBy: { dateVente: 'desc' },
        },
      },
    })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = OpenSchema.parse(request.body)
    const pdv = await app.db.pointDeVente.findFirst({ where: { id: body.pointDeVenteId, tenantId } })
    if (!pdv) return reply.notFound('Point de vente introuvable')
    return reply.status(201).send(
      await app.db.sessionCaisse.create({
        data: {
          ...body,
          tenantId,
          // Si le PDV est le miroir d'un salon, lier automatiquement la session au salon
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...((pdv as any).salonId ? { salonId: (pdv as any).salonId } : {}),
        } as any,
        include: { pointDeVente: { include: { categorie: true } } },
      })
    )
  })

  app.patch('/:id/fermer', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = CloseSchema.parse(request.body)

    const existing = await app.db.sessionCaisse.findFirst({
      where: { id, tenantId },
      include: { pointDeVente: true },
    })
    if (!existing) return reply.notFound()
    if (existing.statut === 'FERMEE') return reply.badRequest('Session déjà fermée')

    const now = new Date()

    const session = await app.db.$transaction(async (tx) => {
      const closed = await tx.sessionCaisse.update({
        where: { id },
        data: { statut: 'FERMEE', dateFermeture: now, ...body },
        include: { pointDeVente: { include: { categorie: true } } },
      })

      // Si le PDV encaisse pour la ME → créer un reversement en attente
      if (!existing.pointDeVente.encaissementDirect) {
        const totaux = await tx.vente.aggregate({
          where: { sessionId: id, statut: 'VALIDEE' },
          _sum:   { totalTTC: true },
          _count: { _all: true },
        })
        const montant = totaux._sum.totalTTC ?? 0
        if (Number(montant) > 0) {
          await tx.reversement.create({
            data: {
              id:             crypto.randomUUID(),
              tenantId,
              pointDeVenteId: existing.pointDeVenteId,
              sessionId:      id,
              montantTTC:     montant,
              nbVentes:       totaux._count._all,
              statut:         'EN_ATTENTE',
              dateCloture:    now,
            },
          })
        }
      }

      return closed
    })

    return session
  })

  // Rouvrir une session fermée par erreur
  app.patch('/:id/rouvrir', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.sessionCaisse.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    if (existing.statut === 'OUVERTE') return reply.badRequest('La session est déjà ouverte')
    return app.db.sessionCaisse.update({
      where: { id },
      data:  { statut: 'OUVERTE', dateFermeture: null, fondFermeture: null },
      include: { pointDeVente: { include: { categorie: true } } },
    })
  })

  // Calcul des droits d'auteurs pour toutes les ventes validées d'une session
  app.get('/:id/droits', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const session = await app.db.sessionCaisse.findFirst({
      where: { id, tenantId },
      include: {
        pointDeVente: { select: { commissionFixe: true, commissionPourcent: true } },
        ventes: {
          where: { statut: 'VALIDEE' },
          include: {
            lignes: {
              include: {
                article: {
                  include: {
                    // Passer par auteurs → contrats pour attraper aussi les contrats globaux (articleId = null)
                    auteurs: {
                      include: {
                        auteur: {
                          include: {
                            contrats: {
                              where: { actif: true },
                              include: { typeDA: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!session) return reply.notFound()

    const pdv = session.pointDeVente
    const avecCommission = !!(pdv.commissionPourcent || pdv.commissionFixe)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typeVente: ContexteVente['typeVente'] = (session as any).salonId ? 'SALON' : 'DIRECTE'
    const contexte: ContexteVente = { vendeur: 'ME', avecCommission, typeVente }

    const contratMap = new Map<string, {
      auteurId: string; nomAuteur: string
      avance: number; avanceDue: number
      formule: FormuleDA; lignes: LigneVenteDA[]
    }>()

    for (const vente of session.ventes) {
      for (const ligne of vente.lignes) {
        for (const articleAuteur of ligne.article.auteurs) {
          const auteur = articleAuteur.auteur
          // Contrats applicables : global (articleId null) OU spécifique à cet article
          const contrats = auteur.contrats.filter(
            c => c.articleId === null || c.articleId === ligne.articleId
          )
          for (const contrat of contrats) {
            if (!contratMap.has(contrat.id)) {
              contratMap.set(contrat.id, {
                auteurId:  auteur.id,
                nomAuteur: `${auteur.prenom} ${auteur.nom}`.trim(),
                avance:    Number(contrat.avance ?? 0),
                avanceDue: Number(contrat.avanceDue),
                formule:   contrat.typeDA.formule as unknown as FormuleDA,
                lignes:    [],
              })
            }
            contratMap.get(contrat.id)!.lignes.push({
              articleId:     ligne.articleId,
              quantite:      ligne.quantite,
              totalLigneHT:  Number(ligne.totalLigneHT),
              totalLigneTTC: Number(ligne.totalLigneTTC),
            })
          }
        }
      }
    }

    const auteurs = []
    for (const [, meta] of contratMap) {
      const res = calculateRoyalties(meta.lignes, meta.formule, contexte, meta.avanceDue, meta.avance)
      auteurs.push({
        auteurId:       meta.auteurId,
        nomAuteur:      meta.nomAuteur,
        taux:           res.taux,
        base:           res.base,
        montantBrut:    res.montantBrut,
        avanceRecoupee: res.avanceRecoupee,
        avanceRestante: res.avanceRestante,
        montantNet:     res.montantNet,
      })
    }

    return {
      auteurs,
      totalNet:  auteurs.reduce((s, a) => s + a.montantNet, 0),
      totalBrut: auteurs.reduce((s, a) => s + a.montantBrut, 0),
      contexte,
    }
  })
}
