import type { FastifyPluginAsync } from 'fastify'
import { adminAuthRoutes }   from './auth.js'
import { adminTenantRoutes } from './tenants.js'
import { adminStatsRoutes }  from './stats.js'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(adminAuthRoutes)
  await app.register(adminTenantRoutes)
  await app.register(adminStatsRoutes)
}
