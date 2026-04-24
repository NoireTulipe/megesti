import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateLivreSchema = z.object({
  id:              z.string().uuid(),
  titre:           z.string().min(1),
  isbn:            z.string().optional(),
  prix:            z.number().nonnegative(),
  datePublication: z.string().datetime().optional(),
  description:     z.string().optional(),
  couvertureUrl:   z.string().url().optional(),
  stock:           z.number().int().nonnegative().default(0),
  auteurIds:       z.array(z.string().uuid()).min(1),
})

const PatchLivreSchema = CreateLivreSchema.omit({ id: true }).partial()

const ListQuerySchema = z.object({
  q:        z.string().optional(),
  auteurId: z.string().uuid().optional(),
  actif:    z.enum(['true', 'false']).optional(),
})

export const livreRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q, auteurId, actif } = ListQuerySchema.parse(request.query)

    return app.db.livre.findMany({
      where: {
        tenantId,
        actif:    actif !== undefined ? actif === 'true' : true,
        ...(q && { titre: { contains: q, mode: 'insensitive' } }),
        ...(auteurId && { auteurs: { some: { auteurId } } }),
      },
      include: {
        auteurs: {
          include: { auteur: { select: { id: true, prenom: true, nom: true, pseudonyme: true } } },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { titre: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const livre = await app.db.livre.findFirst({
      where: { id, tenantId },
      include: {
        auteurs: {
          include: { auteur: true },
          orderBy: { ordre: 'asc' },
        },
      },
    })
    if (!livre) return reply.notFound()
    return livre
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { auteurIds, ...rest } = CreateLivreSchema.parse(request.body)

    const livre = await app.db.livre.create({
      data: {
        ...rest,
        tenantId,
        auteurs: {
          create: auteurIds.map((auteurId, ordre) => ({ auteurId, ordre })),
        },
      },
      include: { auteurs: { include: { auteur: true }, orderBy: { ordre: 'asc' } } },
    })
    return reply.status(201).send(livre)
  })

  app.patch('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const { auteurIds, ...rest } = PatchLivreSchema.parse(request.body)

    const existing = await app.db.livre.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.$transaction(async (tx) => {
      if (auteurIds) {
        await tx.auteurLivre.deleteMany({ where: { livreId: id } })
        await tx.auteurLivre.createMany({
          data: auteurIds.map((auteurId, ordre) => ({ auteurId, livreId: id, ordre })),
        })
      }
      return tx.livre.update({
        where: { id },
        data: rest,
        include: { auteurs: { include: { auteur: true }, orderBy: { ordre: 'asc' } } },
      })
    })
  })

  app.delete('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.livre.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
