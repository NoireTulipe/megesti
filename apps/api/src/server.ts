import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

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

  const corsOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
    .split(',')
    .map(o => o.trim())

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? (() => { throw new Error('JWT_SECRET manquant') })(),
    // 30 j : le mobile salon n'a pas de flow de refresh et peut rester offline longtemps
    sign: { expiresIn: '30d' },
  })

  // cross-origin : les thumbnails sont servies au web/mobile depuis une autre origine
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  })

  // Multipart (upload d'images) — 10 Mo max
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  // Fichiers statiques (thumbnails)
  const uploadsDir = process.env['UPLOAD_DIR'] ?? path.join(process.cwd(), 'uploads')
  await mkdir(uploadsDir, { recursive: true })

  // /api/uploads — passe par le proxy Caddy (/api/* → Fastify) : utilisé par le web et les nouveaux uploads
  await app.register(staticPlugin, {
    root:   uploadsDir,
    prefix: '/api/uploads',
    decorateReply: false,
  })

  // /uploads — accès direct à Fastify : rétrocompat mobile (URLs mises en cache avant le changement de préfixe)
  await app.register(staticPlugin, {
    root:   uploadsDir,
    prefix: '/uploads',
    decorateReply: false,
  })

  await app.register(sensible)

  // Une violation de contrainte unique Prisma (P2002) signifie que la ressource
  // existe déjà : c'est le cas normal d'un retry idempotent côté mobile (ventes,
  // frais... créés avec un UUID client). On renvoie 409 au lieu d'un 500 brut,
  // pour que la file d'attente de synchro puisse le traiter comme un succès.
  app.setErrorHandler((err, request, reply) => {
    if ((err as { code?: string }).code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ressource déjà existante',
      })
    }
    // Body/query invalide : 400 avec le détail des champs, pas un 500 brut
    if (err instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Données invalides',
        issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    // Erreur inattendue en prod : log complet côté serveur, message générique côté client
    if (process.env['NODE_ENV'] === 'production' && ((err as { statusCode?: number }).statusCode ?? 500) >= 500) {
      request.log.error(err)
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Erreur interne',
      })
    }
    return reply.send(err)
  })

  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(queuePlugin)
  await app.register(tenantPlugin)
  await app.register(adminAuthPlugin)
  await app.register(routes,      { prefix: '/api' })
  await app.register(adminRoutes, { prefix: '/admin' })

  return app
}
