import type { FastifyPluginAsync } from 'fastify'

export const mascoteDialogRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Réellement publique : MascoteDialog n'a pas de tenantId, ce sont des
   * contenus pédagogiques globaux, identiques pour tout le monde. Exiger un
   * jeton empêchait d'afficher l'aide sur les pages d'avant-connexion
   * (connexion, mot de passe oublié, réinitialisation).
   */
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const dialog = await app.db.mascoteDialog.findUnique({
      where:  { slug, actif: true },
      select: { id: true, slug: true, imageName: true, bulles: true },
    })
    if (!dialog) return reply.notFound()
    return dialog
  })
}
