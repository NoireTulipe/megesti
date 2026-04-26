import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const SaveSchema = z.object({
  entityId: z.string().uuid(),
  values:   z.array(z.object({
    definitionId: z.string().uuid(),
    value:        z.union([z.string(), z.null()]),
  })),
})

export const customFieldValueRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  // GET /custom-field-values?entityId=xxx
  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { entityId } = request.query as { entityId: string }
    if (!entityId) return {}

    const rows = await app.db.customFieldValue.findMany({
      where: {
        entityId,
        definition: { tenantId },
      },
      select: { definitionId: true, valueText: true },
    })

    return Object.fromEntries(rows.map((r) => [r.definitionId, r.valueText]))
  })

  // PUT /custom-field-values — upsert batch pour une entité
  app.put('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { entityId, values } = SaveSchema.parse(request.body)

    if (values.length === 0) return reply.status(204).send()

    const definitionIds = values.map((v) => v.definitionId)
    const validDefs = await app.db.customFieldDefinition.findMany({
      where: { tenantId, id: { in: definitionIds } },
      select: { id: true },
    })
    const validIds = new Set(validDefs.map((d) => d.id))

    await Promise.all(
      values
        .filter((v) => validIds.has(v.definitionId))
        .map((v) =>
          app.db.customFieldValue.upsert({
            where:  { definitionId_entityId: { definitionId: v.definitionId, entityId } },
            create: { id: crypto.randomUUID(), definitionId: v.definitionId, entityId, valueText: v.value },
            update: { valueText: v.value },
          })
        )
    )

    return reply.status(204).send()
  })
}
