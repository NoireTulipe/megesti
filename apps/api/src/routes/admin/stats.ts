import type { FastifyPluginAsync } from 'fastify'

export const adminStatsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats', { preHandler: app.authenticateAdmin }, async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalTenants, tenantsActifs, tenantsParPlan, ventesAujourdhui, totalVentes] =
      await Promise.all([
        app.db.tenant.count(),
        app.db.tenant.count({ where: { actif: true } }),
        app.db.tenant.groupBy({ by: ['plan'], _count: true }),
        app.db.vente.count({ where: { dateVente: { gte: today } } }),
        app.db.vente.count(),
      ])

    return {
      tenants: { total: totalTenants, actifs: tenantsActifs, parPlan: tenantsParPlan },
      ventes:  { today: ventesAujourdhui, total: totalVentes },
    }
  })
}
