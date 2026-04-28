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
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q, avecContrat } = request.query as { q?: string; avecContrat?: string }

    const contratFilter =
      avecContrat === 'true'  ? { contrats: { some: { actif: true, tenantId } } } :
      avecContrat === 'false' ? { NOT: { contrats: { some: { actif: true, tenantId } } } } :
      {}

    return app.db.auteur.findMany({
      where: {
        tenantId,
        actif: true,
        ...contratFilter,
        ...(q && {
          OR: [
            { nom:    { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { contrats: true } } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const auteur = await app.db.auteur.findFirst({
      where: { id, tenantId },
    })
    if (!auteur) return reply.notFound()
    return auteur
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateAuteurSchema.parse(request.body)

    const auteur = await app.db.auteur.create({
      data: { ...body, tenantId },
    })
    return reply.status(201).send(auteur)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchAuteurSchema.parse(request.body)

    const existing = await app.db.auteur.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()

    return app.db.auteur.update({ where: { id }, data: body })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.auteur.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
