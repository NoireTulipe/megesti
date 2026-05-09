import type { FastifyPluginAsync } from 'fastify'

export const mascoteDialogRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  // Route publique (authentification user requise) : récupère un dialog par slug
  app.get('/:slug', auth, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const dialog = await app.db.mascoteDialog.findUnique({
      where:  { slug, actif: true },
      select: { id: true, slug: true, imageName: true, bulles: true },
    })
    if (!dialog) return reply.notFound()
    return dialog
  })
}
