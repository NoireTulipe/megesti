import type { FastifyPluginAsync } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

const ContactSchema = z.object({
  id:        z.string().uuid(),
  nom:       z.string().min(1),
  prenom:    z.string().optional(),
  email:     z.string().email().optional(),
  telephone: z.string().optional(),
})

const CreateSchema = z.object({
  id:                z.string().uuid(),
  nom:               z.string().min(1),
  typeSalonId:       z.string().uuid().optional(),
  lieu:              z.string().optional(),
  adresse:           z.string().optional(),
  ville:             z.string().optional(),
  pays:              z.string().optional(),
  dateDebut:         z.string().datetime().optional(),
  dateFin:           z.string().datetime().optional(),
  dureeJours:        z.number().int().positive().optional(),
  periodeHabituelle: z.string().optional(),
  prixPrevuFixe:     z.number().nonnegative().optional(),
  prixPrevuPct:      z.number().min(0).max(100).optional(),
  note:              z.number().int().min(0).max(5).optional(),
  commentaires:      z.string().optional(),
  contacts:          z.array(ContactSchema).optional(),
  creerPointDeVente: z.boolean().default(true),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

const include = {
  typeSalon:    true,
  contacts:     true,
  pointDeVente: { select: { id: true, actif: true } },
  sessions:     { select: { id: true, statut: true, ventes: { select: { totalTTC: true, statut: true } } } },
} as const

async function syncPDVMiroir(tx: Prisma.TransactionClient, tenantId: string, salonId: string, salonNom: string, activer: boolean) {
  const existing = await tx.pointDeVente.findUnique({ where: { salonId } })
  if (activer) {
    if (existing) {
      // Réactiver si désactivé + sync du nom
      if (!existing.actif || existing.nom !== salonNom) {
        await tx.pointDeVente.update({ where: { id: existing.id }, data: { actif: true, nom: salonNom } })
      }
    } else {
      await tx.pointDeVente.create({
        data: { id: crypto.randomUUID(), tenantId, salonId, nom: salonNom, encaissementDirect: true },
      })
    }
  } else if (existing && existing.actif) {
    await tx.pointDeVente.update({ where: { id: existing.id }, data: { actif: false } })
  }
}

export const salonRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.salon.findMany({
      where: {
        tenantId, actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include,
      orderBy: [{ dateDebut: 'desc' }, { nom: 'asc' }],
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.salon.findFirst({ where: { id, tenantId }, include })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { contacts, dateDebut, dateFin, prixPrevuFixe, prixPrevuPct, creerPointDeVente, ...rest } = CreateSchema.parse(request.body)

    const rec = await app.db.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: {
          ...rest,
          tenantId,
          dateDebut:     dateDebut     ? new Date(dateDebut) : undefined,
          dateFin:       dateFin       ? new Date(dateFin)   : undefined,
          prixPrevuFixe: prixPrevuFixe ?? null,
          prixPrevuPct:  prixPrevuPct  ?? null,
          contacts: contacts?.length ? { create: contacts as any[] } : undefined,
        } as any,
        include,
      })
      if (creerPointDeVente) {
        await syncPDVMiroir(tx as any, tenantId, salon.id, salon.nom, true)
      }
      return tx.salon.findUniqueOrThrow({ where: { id: salon.id }, include })
    })

    return reply.status(201).send(rec)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { contacts, dateDebut, dateFin, creerPointDeVente, nom, ...rest } = PatchSchema.parse(request.body)
    const existing = await app.db.salon.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.$transaction(async (tx) => {
      if (contacts !== undefined) {
        await tx.contactSalon.deleteMany({ where: { salonId: id } })
        if (contacts.length > 0) await tx.contactSalon.createMany({ data: contacts.map((c) => ({ ...c, salonId: id })) as any[] })
      }

      const salonNom = nom ?? existing.nom

      // Gérer le PDV miroir si la case a changé ou si le nom a changé
      if (creerPointDeVente !== undefined) {
        await syncPDVMiroir(tx as any, tenantId, id, salonNom, creerPointDeVente)
      } else if (nom && nom !== existing.nom) {
        // Sync du nom sur le PDV miroir existant
        const pdv = await tx.pointDeVente.findUnique({ where: { salonId: id } })
        if (pdv?.actif) await tx.pointDeVente.update({ where: { id: pdv.id }, data: { nom: salonNom } })
      }

      return tx.salon.update({
        where: { id },
        data: {
          ...rest,
          ...(nom       !== undefined ? { nom }                                                              : {}),
          ...(dateDebut !== undefined ? { dateDebut: dateDebut ? new Date(dateDebut) : null }               : {}),
          ...(dateFin   !== undefined ? { dateFin:   dateFin   ? new Date(dateFin)   : null }               : {}),
        },
        include,
      })
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.$transaction(async (tx) => {
      // Désactiver le PDV miroir s'il existe
      const pdv = await tx.pointDeVente.findUnique({ where: { salonId: id } })
      if (pdv?.actif) await tx.pointDeVente.update({ where: { id: pdv.id }, data: { actif: false } })
      await tx.salon.updateMany({ where: { id, tenantId }, data: { actif: false } })
    })
    return reply.status(204).send()
  })
}
