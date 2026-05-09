import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const SlideSchema = z.object({
  imageName: z.string().default('m1.png'),
  title:     z.string().optional(),
  text:      z.string().min(1),
  ctaLabel:  z.string().optional(),
  ctaHref:   z.string().optional(),
})

const PopupSchema = z.object({
  titre:       z.string().min(1),
  mode:        z.enum(['SHOW_ONCE', 'DISMISSIBLE', 'ALWAYS_CLOSABLE', 'ALWAYS_BLOCKING']),
  dismissText: z.string().default('Ne plus afficher ce message'),
  slides:      z.array(SlideSchema).min(1),
  targetPages: z.array(z.string()).default([]),
  actif:       z.boolean().default(true),
  dateDebut:   z.string().datetime().optional().nullable(),
  dateFin:     z.string().datetime().optional().nullable(),
})

export const adminPopupRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticateAdmin }

  app.get('/popups', auth, async () =>
    app.db.popup.findMany({ orderBy: { createdAt: 'desc' } })
  )

  app.get('/popups/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const popup = await app.db.popup.findUnique({ where: { id } })
    if (!popup) return reply.notFound()
    return popup
  })

  app.post('/popups', auth, async (request, reply) => {
    const body = PopupSchema.parse(request.body)
    return reply.status(201).send(
      await app.db.popup.create({ data: { ...body, slides: body.slides as any, targetPages: body.targetPages as any } })
    )
  })

  app.patch('/popups/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = PopupSchema.partial().parse(request.body)
    const existing = await app.db.popup.findUnique({ where: { id } })
    if (!existing) return reply.notFound()
    return app.db.popup.update({
      where: { id },
      data:  { ...body, ...(body.slides ? { slides: body.slides as any } : {}), ...(body.targetPages ? { targetPages: body.targetPages as any } : {}) },
    })
  })

  app.delete('/popups/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await app.db.popup.findUnique({ where: { id } })
    if (!existing) return reply.notFound()
    await app.db.popup.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Stats : nb de dismissals par popup
  app.get('/popups/:id/stats', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const count = await app.db.popupVu.count({ where: { popupId: id } })
    return { popupId: id, vuCount: count }
  })
}
