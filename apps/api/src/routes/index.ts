import type { FastifyPluginAsync } from 'fastify'
import { authRoutes }      from './auth.js'
import { thesaurusRoutes } from './thesaurus.js'
import { customFieldRoutes }      from './custom-fields.js'
import { customFieldValueRoutes } from './custom-field-values.js'
import { auteurRoutes }                   from './auteurs.js'
import { maisonEditionRoutes }            from './maisons-edition.js'
import { depotLibraireRoutes }            from './depots-libraires.js'
import { salonRoutes }                    from './salons.js'
import { categoriePointDeVenteRoutes }    from './categories-point-de-vente.js'
import { pointDeVenteRoutes }             from './points-de-vente.js'
import { sessionCaisseRoutes }            from './sessions-caisse.js'
import { venteRoutes }                    from './ventes.js'
import { rayonRoutes }     from './rayons.js'
import { categorieRoutes } from './categories.js'
import { articleRoutes }   from './articles.js'
import { dashboardRoutes }     from './dashboard.js'
import { typeSalonRoutes }      from './types-salon.js'
import { typeDARoutes }         from './types-da.js'
import { contratAuteurRoutes }  from './contrats-auteur.js'

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes,        { prefix: '/auth' })
  await app.register(thesaurusRoutes,   { prefix: '/thesauri' })
  await app.register(customFieldRoutes,      { prefix: '/custom-fields' })
  await app.register(customFieldValueRoutes, { prefix: '/custom-field-values' })
  await app.register(auteurRoutes,                   { prefix: '/auteurs' })
  await app.register(maisonEditionRoutes,            { prefix: '/maisons-edition' })
  await app.register(depotLibraireRoutes,            { prefix: '/depots-libraires' })
  await app.register(salonRoutes,                    { prefix: '/salons' })
  await app.register(categoriePointDeVenteRoutes,    { prefix: '/categories-point-de-vente' })
  await app.register(pointDeVenteRoutes,             { prefix: '/points-de-vente' })
  await app.register(sessionCaisseRoutes,            { prefix: '/sessions-caisse' })
  await app.register(venteRoutes,                    { prefix: '/ventes' })
  await app.register(rayonRoutes,       { prefix: '/rayons' })
  await app.register(categorieRoutes,   { prefix: '/categories' })
  await app.register(articleRoutes,     { prefix: '/articles' })
  await app.register(dashboardRoutes,    { prefix: '/dashboard' })
  await app.register(typeSalonRoutes,    { prefix: '/types-salon' })
  await app.register(typeDARoutes,       { prefix: '/types-da' })
  await app.register(contratAuteurRoutes, { prefix: '/contrats-auteur' })
}
