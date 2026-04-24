import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const prisma = new PrismaClient({
    log: app.log.level === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

  await prisma.$connect()

  app.decorate('db', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export const prismaPlugin = fp(plugin, { name: 'prisma' })
