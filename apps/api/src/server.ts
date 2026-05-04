import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'

import { prismaPlugin }    from './plugins/prisma.js'
import { redisPlugin }     from './plugins/redis.js'
import { queuePlugin }     from './plugins/queue.js'
import { tenantPlugin }    from './plugins/tenant.js'
import { adminAuthPlugin } from './plugins/adminAuth.js'
import { routes }          from './routes/index.js'
import { adminRoutes }     from './routes/admin/index.js'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  })

  const corsOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(o => o.trim())

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? (() => { throw new Error('JWT_SECRET manquant') })(),
  })

  await app.register(sensible)
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(queuePlugin)
  await app.register(tenantPlugin)
  await app.register(adminAuthPlugin)
  await app.register(routes,       { prefix: '/api' })
  await app.register(adminRoutes,  { prefix: '/admin' })

  return app
}
