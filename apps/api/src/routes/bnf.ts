import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { lookupIsbn } from '../services/BnfService.js'

const ParamsSchema = z.object({
  isbn: z.string().min(10).max(17).regex(/^[\d\-X]+$/, 'ISBN invalide'),
})

export const bnfRoutes: FastifyPluginAsync = async (app) => {
  app.get('/isbn/:isbn', { preHandler: app.authenticate }, async (request, reply) => {
    const { isbn } = ParamsSchema.parse(request.params)
    const { tenantId } = request.tenant

    const tenant = await app.db.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: { franchiseBaseVA: true },
    })

    try {
      const info = await lookupIsbn(isbn, tenant.franchiseBaseVA)
      if (!info) return reply.notFound()
      return info
    } catch (err) {
      request.log.warn({ err, isbn }, 'BNF lookup failed')
      return reply.serviceUnavailable('Le catalogue BNF est momentanément inaccessible')
    }
  })
}
