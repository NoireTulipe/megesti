import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CreateCustomFieldDefinitionSchema, ENTITY_TYPES } from '@megesti/shared'

const EntityTypeQuery = z.object({
  entityType: z.enum(ENTITY_TYPES),
})

export const customFieldRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  // Liste les définitions pour un type d'entité
  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    const { entityType } = EntityTypeQuery.parse(request.query)

    return app.db.customFieldDefinition.findMany({
      where: { tenantId, entityType },
      orderBy: { position: 'asc' },
    })
  })

  // Crée une définition
  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateCustomFieldDefinitionSchema.parse(request.body)

    const definition = await app.db.customFieldDefinition.create({
      data: {
        id:          body.id,
        tenantId,
        entityType:  body.entityType,
        labelFr:     body.label.fr,
        labelEn:     body.label.en,
        fieldType:   body.fieldType,
        position:    body.position,
        required:    body.required,
        thesaurusId: body.fieldType === 'thesaurus' ? body.thesaurusId : null,
        options:     body.fieldType === 'select' ? body.options : null,
      },
    })
    return reply.status(201).send(definition)
  })

  // Supprime une définition (cascade sur les valeurs via Prisma)
  app.delete('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.customFieldDefinition.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
