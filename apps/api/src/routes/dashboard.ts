import type { FastifyPluginAsync } from 'fastify'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/stats', auth, async (request) => {
    const { tenantId } = request.tenant

    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)

    const [caMois, ventesTotales, sessionActive, stockAlerte, activiteRecente] = await Promise.all([
      // CA du mois en cours (ventes validées)
      app.db.vente.aggregate({
        where: { tenantId, statut: 'VALIDEE', dateVente: { gte: debutMois } },
        _sum: { totalTTC: true },
        _count: true,
      }),

      // Nombre total de ventes validées (pour comparer avec mois précédent)
      app.db.vente.aggregate({
        where: { tenantId, statut: 'VALIDEE' },
        _count: true,
      }),

      // Session caisse ouverte
      app.db.sessionCaisse.findFirst({
        where: { tenantId, statut: 'OUVERTE' },
        include: { pointDeVente: { select: { nom: true } } },
        orderBy: { dateOuverture: 'desc' },
      }),

      // Articles en alerte de stock
      app.db.article.findMany({
        where: { tenantId, actif: true, stock: { gt: 0 } },
        select: { id: true, nom: true, stock: true, stockAlerte: true },
      }).then((articles) => articles.filter((a) => a.stock <= a.stockAlerte)),

      // 5 dernières ventes
      app.db.vente.findMany({
        where: { tenantId, statut: 'VALIDEE' },
        orderBy: { dateVente: 'desc' },
        take: 5,
        select: {
          id: true,
          numero: true,
          dateVente: true,
          totalTTC: true,
          modePaiement: true,
          lignes: {
            take: 1,
            include: { article: { select: { nom: true } } },
          },
        },
      }),
    ])

    return {
      caMois: {
        totalTTC: Number(caMois._sum.totalTTC ?? 0),
        nombreVentes: caMois._count,
      },
      sessionActive: sessionActive
        ? { id: sessionActive.id, pointDeVente: sessionActive.pointDeVente.nom, dateOuverture: sessionActive.dateOuverture }
        : null,
      alertesStock: stockAlerte.map((a) => ({
        id: a.id,
        nom: a.nom,
        stock: a.stock,
        stockAlerte: a.stockAlerte,
      })),
      activiteRecente: activiteRecente.map((v) => ({
        id: v.id,
        numero: v.numero,
        dateVente: v.dateVente,
        totalTTC: Number(v.totalTTC),
        modePaiement: v.modePaiement,
        premierArticle: v.lignes[0]?.article.nom ?? null,
      })),
    }
  })
}
