import type { FastifyPluginAsync } from 'fastify'
import { adminAuthRoutes }          from './auth.js'
import { adminTenantRoutes }        from './tenants.js'
import { adminStatsRoutes }         from './stats.js'
import { adminMascoteDialogRoutes } from './mascoteDialogs.js'
import { adminPopupRoutes }          from './popups.js'
import { adminInterventionRoutes }   from './interventions.js'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(adminAuthRoutes)
  await app.register(adminTenantRoutes)
  await app.register(adminStatsRoutes)
  await app.register(adminMascoteDialogRoutes)
  await app.register(adminPopupRoutes)
  await app.register(adminInterventionRoutes)
}
