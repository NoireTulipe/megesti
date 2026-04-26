import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CreateCustomFieldDefinitionSchema, ENTITY_TYPES } from '@megesti/shared'

const FilterQuery = z.object({
  entityType: z.enum(ENTITY_TYPES).optional(),
  rayonId:    z.string().uuid().optional(),
})

const UpdateSchema = z.object({
  labelFr:     z.string().min(1).optional(),
  required:    z.boolean().optional(),
  category:    z.string().nullable().optional(),
  position:    z.number().int().optional(),
  halfWidth:   z.boolean().optional(),
  placeholder: z.string().nullable().optional(),
  validation:  z.object({
    type:    z.enum(['email', 'phone', 'name', 'regex']),
    pattern: z.string().optional(),
    message: z.string().min(1),
  }).nullable().optional(),
})

export const customFieldRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate }

  app.get('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { entityType, rayonId } = FilterQuery.parse(request.query)
    if (!entityType && !rayonId) return reply.badRequest('entityType ou rayonId requis')
    return app.db.customFieldDefinition.findMany({
      where:   { tenantId, ...(entityType ? { entityType } : { rayonId }) },
      orderBy: { position: 'asc' },
    })
  })

  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateCustomFieldDefinitionSchema.parse(request.body)
    const definition = await app.db.customFieldDefinition.create({
      data: {
        id:          body.id,
        tenantId,
        entityType:  body.entityType ?? null,
        rayonId:     (body as any).rayonId ?? null, // eslint-disable-line @typescript-eslint/no-explicit-any
        labelFr:     body.label.fr,
        labelEn:     body.label.en,
        fieldType:   body.fieldType,
        position:    body.position,
        required:    body.required,
        thesaurusId: body.fieldType === 'thesaurus' ? body.thesaurusId : null,
        options:     body.fieldType === 'select'    ? body.options      : null,
        category:    body.category   ?? null,
        halfWidth:   body.halfWidth  ?? false,
        placeholder: body.placeholder ?? null,
        validation:  body.validation  ?? null,
      },
    })
    return reply.status(201).send(definition)
  })

  app.patch('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const body = UpdateSchema.parse(request.body)
    const existing = await app.db.customFieldDefinition.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.customFieldDefinition.update({ where: { id }, data: body })
  })

  app.delete('/:id', auth, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.customFieldDefinition.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    await app.db.customFieldDefinition.delete({ where: { id } })
    return reply.status(204).send()
  })
}
