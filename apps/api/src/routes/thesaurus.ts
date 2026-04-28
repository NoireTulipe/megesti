import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { LocalizedStringSchema, CreateThesaurusSchema, CreateThesaurusEntrySchema } from '@megesti/shared'

export const thesaurusRoutes: FastifyPluginAsync = async (app) => {
  const auth      = { preHandler: app.authenticate }
  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }

  // Liste tous les thésaurus du tenant
  app.get('/', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.thesaurus.findMany({
      where: { tenantId },
      include: { entries: { orderBy: [{ parentId: 'asc' }, { position: 'asc' }] } },
      orderBy: { nameFr: 'asc' },
    })
  })

  // Crée un thésaurus
  app.post('/', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = CreateThesaurusSchema.parse(request.body)

    const thesaurus = await app.db.thesaurus.create({
      data: {
        id:      body.id,
        tenantId,
        nameFr:  body.name.fr,
        nameEn:  body.name.en,
        descFr:  body.description?.fr,
        descEn:  body.description?.en,
      },
    })
    return reply.status(201).send(thesaurus)
  })

  // Ajoute une entrée
  app.post('/:thesaurusId/entries', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { thesaurusId } = request.params as { thesaurusId: string }

    // Vérifie que le thésaurus appartient au tenant
    await app.db.thesaurus.findFirstOrThrow({ where: { id: thesaurusId, tenantId } })

    const body = CreateThesaurusEntrySchema.parse(request.body)
    const entry = await app.db.thesaurusEntry.create({
      data: {
        id:          body.id,
        thesaurusId,
        labelFr:     body.label.fr,
        labelEn:     body.label.en,
        position:    body.position,
        parentId:    body.parentId,
      },
    })
    return reply.status(201).send(entry)
  })

  // Supprime un thésaurus
  app.delete('/:id', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    await app.db.thesaurus.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
