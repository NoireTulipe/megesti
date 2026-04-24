import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'

import { prismaPlugin } from './plugins/prisma.js'
import { tenantPlugin } from './plugins/tenant.js'
import { routes } from './routes/index.js'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  })

  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? (() => { throw new Error('JWT_SECRET manquant') })(),
  })

  await app.register(sensible)
  await app.register(prismaPlugin)
  await app.register(tenantPlugin)
  await app.register(routes, { prefix: '/api' })

  return app
}
