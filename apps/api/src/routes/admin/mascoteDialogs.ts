import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const BulleSchema = z.object({
  title: z.string().optional(),
  text:  z.string().min(1),
  cta:   z.object({
    label: z.string().min(1),
    href:  z.string().optional(),
  }).optional(),
})

const DialogSchema = z.object({
  slug:        z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug : minuscules, chiffres et tirets uniquement'),
  description: z.string().min(1),
  imageName:   z.string().default('m1.png'),
  bulles:      z.array(BulleSchema).min(1),
  actif:       z.boolean().default(true),
})

export const adminMascoteDialogRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticateAdmin }

  // ── Liste ──────────────────────────────────────────────────────────────────
  app.get('/mascote-dialogs', auth, async () => {
    return app.db.mascoteDialog.findMany({ orderBy: { slug: 'asc' } })
  })

  // ── Détail ─────────────────────────────────────────────────────────────────
  app.get('/mascote-dialogs/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const dialog = await app.db.mascoteDialog.findUnique({ where: { id } })
    if (!dialog) return reply.notFound()
    return dialog
  })

  // ── Créer ──────────────────────────────────────────────────────────────────
  app.post('/mascote-dialogs', auth, async (request, reply) => {
    const body = DialogSchema.parse(request.body)
    const existing = await app.db.mascoteDialog.findUnique({ where: { slug: body.slug } })
    if (existing) return reply.conflict(`Le slug « ${body.slug} » est déjà utilisé.`)
    const dialog = await app.db.mascoteDialog.create({ data: body })
    return reply.status(201).send(dialog)
  })

  // ── Modifier ───────────────────────────────────────────────────────────────
  app.patch('/mascote-dialogs/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = DialogSchema.partial().parse(request.body)
    const existing = await app.db.mascoteDialog.findUnique({ where: { id } })
    if (!existing) return reply.notFound()
    // Vérifier unicité slug si modifié
    if (body.slug && body.slug !== existing.slug) {
      const conflict = await app.db.mascoteDialog.findUnique({ where: { slug: body.slug } })
      if (conflict) return reply.conflict(`Le slug « ${body.slug} » est déjà utilisé.`)
    }
    return app.db.mascoteDialog.update({ where: { id }, data: body })
  })

  // ── Supprimer ──────────────────────────────────────────────────────────────
  app.delete('/mascote-dialogs/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await app.db.mascoteDialog.findUnique({ where: { id } })
    if (!existing) return reply.notFound()
    await app.db.mascoteDialog.delete({ where: { id } })
    return reply.status(204).send()
  })
}
