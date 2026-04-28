import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import Redis from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })

  redis.on('error', (err) => app.log.error({ err }, 'Redis error'))

  app.decorate('redis', redis)
  app.addHook('onClose', async () => redis.quit())
}

export const redisPlugin = fp(plugin, { name: 'redis' })
