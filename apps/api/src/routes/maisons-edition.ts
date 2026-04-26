import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:        z.string().uuid(),
  nom:       z.string().min(1),
  siret:     z.string().optional(),
  email:     z.string().email().optional(),
  telephone: z.string().optional(),
  adresse:   z.string().optional(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const maisonEditionRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.maisonEdition.findMany({
      where: {
        tenantId,
        actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      orderBy: { nom: 'asc' },
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.maisonEdition.findFirst({ where: { id, tenantId } })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    const rec = await app.db.maisonEdition.create({ data: { ...body, tenantId } })
    return reply.status(201).send(rec)
  })

  app.patch('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.maisonEdition.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.maisonEdition.update({ where: { id }, data: body })
  })

  app.delete('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.maisonEdition.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
