import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateSchema = z.object({
  id:        z.string().uuid(),
  nom:       z.string().min(1),
  lieu:      z.string().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin:   z.string().datetime().optional(),
})

const PatchSchema = CreateSchema.omit({ id: true }).partial()

export const salonRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }
  const authAdmin  = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { q } = request.query as { q?: string }
    return app.db.salon.findMany({
      where: {
        tenantId,
        actif: true,
        ...(q && { nom: { contains: q, mode: 'insensitive' } }),
      },
      orderBy: [{ dateDebut: 'desc' }, { nom: 'asc' }],
    })
  })

  app.get('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const rec = await app.db.salon.findFirst({ where: { id, tenantId } })
    if (!rec) return reply.notFound()
    return rec
  })

  app.post('/', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateSchema.parse(request.body)
    const rec = await app.db.salon.create({
      data: {
        ...body,
        tenantId,
        dateDebut: body.dateDebut ? new Date(body.dateDebut) : undefined,
        dateFin:   body.dateFin   ? new Date(body.dateFin)   : undefined,
      },
    })
    return reply.status(201).send(rec)
  })

  app.patch('/:id', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = PatchSchema.parse(request.body)
    const existing = await app.db.salon.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.salon.update({
      where: { id },
      data: {
        ...body,
        dateDebut: body.dateDebut ? new Date(body.dateDebut) : body.dateDebut,
        dateFin:   body.dateFin   ? new Date(body.dateFin)   : body.dateFin,
      },
    })
  })

  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.salon.updateMany({ where: { id, tenantId }, data: { actif: false } })
    return reply.status(204).send()
  })
}
