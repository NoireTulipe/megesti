import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const ContactSchema = z.object({
  nom:       z.string().min(1),
  prenom:    z.string().optional(),
  email:     z.string().email().optional().nullable().or(z.literal('')).transform((v) => v || null),
  telephone: z.string().optional().nullable(),
})

const CreateSchema = z.object({
  id:            z.string().uuid(),
  nom:           z.string().min(1),
  lienCommande:  z.string().url().optional().nullable().or(z.literal('')).transform((v) => v || null),
  pointsForts:   z.array(z.string()).default([]),
  pointsFaibles: z.array(z.string()).default([]),
  noteLibre:     z.string().optional().nullable(),
  contacts:      z.array(ContactSchema).default([]),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const imprimeurRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.imprimeur.findMany({
      where: {
        tenantId,
        actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      include: { contacts: true },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.imprimeur.findFirst({
      where: { id, tenantId },
      include: { contacts: true, articles: { select: { id: true, nom: true, isbn: true } } },
    })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { contacts, ...body } = CreateSchema.parse(request.body)
    const rec = await app.db.imprimeur.create({
      data: {
        ...body,
        tenantId,
        contacts: contacts.length ? { create: contacts } : undefined,
      },
      include: { contacts: true },
    })
    return reply.status(201).send(rec)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.imprimeur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    const { contacts, ...body } = PatchSchema.parse(request.body)

    const rec = await app.db.$transaction(async (tx) => {
      if (contacts !== undefined) {
        await tx.contactImprimeur.deleteMany({ where: { imprimeurId: id } })
      }
      return tx.imprimeur.update({
        where: { id },
        data: {
          ...body,
          ...(contacts !== undefined && contacts.length > 0
            ? { contacts: { create: contacts } }
            : {}),
        },
        include: { contacts: true },
      })
    })
    return rec
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.imprimeur.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
