import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const popupRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  /**
   * Retourne les popups à afficher pour l'utilisateur courant.
   * ?page=/ventes  →  filtre sur les popups ciblant cette route (+ celles sans ciblage)
   */
  app.get('/pending', auth, async (request) => {
    const { userId } = request.tenant
    const { page } = request.query as { page?: string }
    const now = new Date()

    // Tous les popups actifs dans la fenêtre de dates
    const allPopups = await app.db.popup.findMany({
      where: {
        actif: true,
        OR: [{ dateDebut: null }, { dateDebut: { lte: now } }],
        AND: [{ OR: [{ dateFin: null }, { dateFin: { gte: now } }] }],
      },
      orderBy: { createdAt: 'asc' },
    })

    // IDs déjà vus par cet utilisateur
    const vus = await app.db.popupVu.findMany({
      where: { userId },
      select: { popupId: true },
    })
    const vuIds = new Set(vus.map(v => v.popupId))

    return allPopups.filter(p => {
      // Ciblage page
      const pages = p.targetPages as string[]
      if (pages.length > 0 && page) {
        const match = pages.some(route => page === route || page.startsWith(route))
        if (!match) return false
      }

      // Modes qui respectent le "déjà vu"
      if (p.mode === 'SHOW_ONCE' || p.mode === 'DISMISSIBLE') {
        return !vuIds.has(p.id)
      }

      // ALWAYS_CLOSABLE et ALWAYS_BLOCKING : toujours affichés
      return true
    })
  })

  /**
   * Marque un popup comme vu (dismiss ou close).
   * Pour SHOW_ONCE : appelé automatiquement à l'affichage.
   * Pour DISMISSIBLE : appelé quand l'user coche "Ne plus afficher".
   */
  app.post('/:id/vu', auth, async (request, reply) => {
    const { userId } = request.tenant
    const { id }     = request.params as { id: string }

    await app.db.popupVu.upsert({
      where:  { userId_popupId: { userId, popupId: id } },
      update: {},
      create: { userId, popupId: id },
    })

    return reply.status(204).send()
  })
}
