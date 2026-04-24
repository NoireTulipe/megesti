import type { FastifyPluginAsync } from 'fastify'
import { authRoutes }        from './auth.js'
import { thesaurusRoutes }   from './thesaurus.js'
import { customFieldRoutes } from './custom-fields.js'
import { auteurRoutes }      from './auteurs.js'
import { livreRoutes }       from './livres.js'

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes,        { prefix: '/auth' })
  await app.register(thesaurusRoutes,   { prefix: '/thesauri' })
  await app.register(customFieldRoutes, { prefix: '/custom-fields' })
  await app.register(auteurRoutes,      { prefix: '/auteurs' })
  await app.register(livreRoutes,       { prefix: '/livres' })
}
