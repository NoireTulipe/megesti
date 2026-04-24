import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateAuteurSchema = z.object({
  id:         z.string().uuid(),
  prenom:     z.string().min(1),
  nom:        z.string().min(1),
  pseudonyme: z.string().optional(),
  email:      z.string().email().optional(),
  bio:        z.string().optional(),
})

const PatchAuteurSchema = CreateAuteurSchema.omit({ id: true }).partial()

export const auteurRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }

    return app.db.auteur.findMany({
      where: {
        tenantId,
        actif: true,
        ...(q && {
          OR: [
            { nom:    { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const auteur = await app.db.auteur.findFirst({
      where: { id, tenantId },
      include: {
        livres: {
          include: { livre: { select: { id: true, titre: true, isbn: true, prix: true, couvertureUrl: true } } },
          orderBy: { ordre: 'asc' },
        },
      },
    })
    if (!auteur) return reply.notFound()
    return auteur
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateAuteurSchema.parse(request.body)

    const auteur = await app.db.auteur.create({
      data: { ...body, tenantId },
    })
    return reply.status(201).send(auteur)
  })

  app.patch('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchAuteurSchema.parse(request.body)

    const existing = await app.db.auteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.auteur.update({ where: { id }, data: body })
  })

  app.delete('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.auteur.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
