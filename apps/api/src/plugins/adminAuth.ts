import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

export interface AdminPayload {
  adminId: string
  role:    'SUPERADMIN'
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticateAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    admin: AdminPayload
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('admin', null as unknown as AdminPayload)

  app.decorate('authenticateAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<AdminPayload>()
      if (payload.role !== 'SUPERADMIN') {
        return reply.forbidden('Accès réservé aux administrateurs')
      }
      request.admin = payload
    } catch {
      reply.unauthorized('Token admin invalide ou manquant')
    }
  })
}

export const adminAuthPlugin = fp(plugin, { name: 'adminAuth', dependencies: ['prisma'] })
