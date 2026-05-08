import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { UserRole } from '@prisma/client'
import { getPlanFeatures, type PlanFeatures } from '@megesti/shared'

export interface TenantPayload {
  tenantId: string
  userId:   string
  role:     string
  plan:     string
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate:   (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole:    (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireFeature: (feature: keyof PlanFeatures) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
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
      // Récupère le plan courant depuis la DB (peut changer sans re-login)
      const tenant = await app.db.tenant.findUnique({
        where:  { id: payload.tenantId },
        select: { plan: true },
      })
      request.tenant = { ...payload, plan: tenant?.plan ?? 'TRIAL' }
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

  app.decorate('requireFeature', (feature: keyof PlanFeatures) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const features = getPlanFeatures(request.tenant.plan)
      const val = features[feature]
      const allowed = typeof val === 'boolean' ? val : val !== null && val !== 'reseau'
      if (!allowed) {
        reply.status(402).send({
          error:   'PlanUpgradeRequired',
          feature,
          message: `Cette fonctionnalité nécessite un plan supérieur.`,
        })
      }
    },
  )
}

export const tenantPlugin = fp(plugin, { name: 'tenant', dependencies: ['prisma'] })
