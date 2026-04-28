import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { UserRole } from '@prisma/client'

export interface TenantPayload {
  tenantId: string
  userId:   string
  role:     string
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    tenant: TenantPayload
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('tenant', null as unknown as TenantPayload)

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<TenantPayload>()
      request.tenant = payload
    } catch {
      reply.unauthorized('Token invalide ou manquant')
    }
  })

  app.decorate('requireRole', (...roles: UserRole[]) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!roles.includes(request.tenant.role as UserRole)) {
        reply.forbidden('Accès non autorisé')
      }
    },
  )
}

export const tenantPlugin = fp(plugin, { name: 'tenant', dependencies: ['prisma'] })
