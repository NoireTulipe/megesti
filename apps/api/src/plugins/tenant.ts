import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

export interface TenantPayload {
  tenantId: string
  userId:   string
  role:     string
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    tenant: TenantPayload
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('tenant', null)

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<TenantPayload>()
      request.tenant = payload
    } catch {
      reply.unauthorized('Token invalide ou manquant')
    }
  })
}

export const tenantPlugin = fp(plugin, { name: 'tenant', dependencies: ['prisma'] })
