import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const ContactSchema = z.object({
  nom:          z.string().min(1),
  prenom:       z.string().optional().nullable(),
  email:        z.string().email().optional().nullable().or(z.literal('')).transform(v => v || null),
  telephone:    z.string().optional().nullable(),
  typePaiement: z.enum(['VIREMENT', 'CHEQUE']).optional().nullable(),
})

const CreateSchema = z.object({
  id:                 z.string().uuid(),
  nom:                z.string().min(1),
  categorieId:        z.string().uuid().optional().nullable(),
  commissionFixe:     z.number().nonnegative().optional().nullable(),
  commissionPourcent: z.number().min(0).max(100).optional().nullable(),
  encaissementDirect: z.boolean().default(true),
  contacts:           z.array(ContactSchema).default([]),
})

const PatchSchema = z.object({
  nom:                z.string().min(1).optional(),
  categorieId:        z.string().uuid().optional().nullable(),
  commissionFixe:     z.number().nonnegative().optional().nullable(),
  commissionPourcent: z.number().min(0).max(100).optional().nullable(),
  encaissementDirect: z.boolean().optional(),
  contacts:           z.array(ContactSchema).optional(),
})

const INCLUDE = { categorie: true, contacts: true }

export const pointDeVenteRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.pointDeVente.findMany({
      where: {
        tenantId, actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include: INCLUDE,
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.pointDeVente.findFirst({ where: { id, tenantId }, include: INCLUDE })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { contacts, ...body } = CreateSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.pointDeVente.create({
        data: {
          ...body, tenantId,
          contacts: contacts.length ? { create: contacts as any[] } : undefined,
        } as any,
        include: INCLUDE,
      })
    )
  })

  app.patch('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.pointDeVente.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    const { contacts, ...body } = PatchSchema.parse(request.body)

    const rec = await app.db.$transaction(async (tx) => {
      if (contacts !== undefined) {
        await tx.contactPointDeVente.deleteMany({ where: { pointDeVenteId: id } })
      }
      return tx.pointDeVente.update({
        where: { id },
        data: {
          ...body,
          ...(contacts?.length ? { contacts: { create: contacts as any[] } } : {}),
        } as any,
        include: INCLUDE,
      })
    })
    return rec
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.pointDeVente.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
