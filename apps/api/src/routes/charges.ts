import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

// ── Helpers abonnement ────────────────────────────────────────────────────────

function addPeriode(d: Date, periodicite: string): Date {
  const r = new Date(d)
  if (periodicite === 'MENSUELLE')     r.setMonth(r.getMonth() + 1)
  if (periodicite === 'TRIMESTRIELLE') r.setMonth(r.getMonth() + 3)
  if (periodicite === 'SEMESTRIELLE')  r.setMonth(r.getMonth() + 6)
  if (periodicite === 'ANNUELLE')      r.setFullYear(r.getFullYear() + 1)
  return r
}

/** Prochaine occurrence strictement après `since` (défaut = maintenant) */
function calcProchaineEcheance(dateEffet: Date, periodicite: string, since = new Date()): Date {
  let cur = new Date(dateEffet)
  while (cur <= since) cur = addPeriode(cur, periodicite)
  return cur
}

/** Toutes les occurrences dans [from, to] */
export function occurrencesDansPeriode(dateEffet: Date, periodicite: string, from: Date, to: Date): Date[] {
  const result: Date[] = []
  let cur = new Date(dateEffet)
  while (cur <= to) {
    if (cur >= from) result.push(new Date(cur))
    cur = addPeriode(cur, periodicite)
  }
  return result
}

// ── Schémas de validation ─────────────────────────────────────────────────────

const CATEGORIES = ['ACHATS', 'SERVICES', 'IMPOTS_TAXES', 'AUTRES_CHARGES', 'CHARGES_EXCEPT'] as const

const CreateSchema = z.object({
  id:                z.string().uuid(),
  libelle:           z.string().min(1),
  montantHT:         z.number().nonnegative(),
  tauxTVA:           z.number().min(0).max(100).default(0),
  type:              z.enum(['DEPENSE', 'ABONNEMENT', 'PERTE']),
  categorie:         z.enum(CATEGORIES).optional(),
  // Pour DEPENSE/PERTE uniquement (ignoré pour ABONNEMENT)
  statut:            z.enum(['PREVU', 'PAYE']).default('PREVU'),
  dateEffet:         z.string().datetime(),
  datePaiement:      z.string().datetime().optional(),
  periodicite:       z.enum(['MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE']).optional(),
  notes:             z.string().optional(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const chargeRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR'), app.requireFeature('charges')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const q = request.query as { type?: string; actif?: string }
    const now = new Date()

    const charges = await app.db.charge.findMany({
      where: {
        tenantId,
        actif: q.actif !== undefined ? q.actif === 'true' : true,
        ...(q.type && { type: q.type as 'DEPENSE' | 'ABONNEMENT' | 'PERTE' }),
      },
      orderBy: [{ type: 'asc' }, { dateEffet: 'desc' }],
    })

    // Pour les abonnements, injecter la prochaine échéance calculée
    return charges.map(c => ({
      ...c,
      prochaineEcheance: c.type === 'ABONNEMENT' && c.periodicite
        ? calcProchaineEcheance(c.dateEffet, c.periodicite, now).toISOString()
        : c.prochaineEcheance?.toISOString() ?? null,
    }))
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { dateEffet, datePaiement, ...rest } = CreateSchema.parse(request.body)
    const dEffet = new Date(dateEffet)

    return reply.status(201).send(
      await app.db.charge.create({
        data: {
          ...rest,
          tenantId,
          dateEffet: dEffet,
          datePaiement: datePaiement ? new Date(datePaiement) : null,
          // prochaineEcheance calculée dynamiquement, pas stockée
          prochaineEcheance: null,
        } as any,
      })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { dateEffet, datePaiement, ...rest } = PatchSchema.parse(request.body)
    const existing = await app.db.charge.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.charge.update({
      where: { id },
      data: {
        ...rest,
        ...(dateEffet    !== undefined ? { dateEffet:    new Date(dateEffet) }                              : {}),
        ...(datePaiement !== undefined ? { datePaiement: datePaiement ? new Date(datePaiement) : null }    : {}),
      },
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.charge.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.charge.update({ where: { id }, data: { actif: false } })
    return reply.status(204).send()
  })
}
