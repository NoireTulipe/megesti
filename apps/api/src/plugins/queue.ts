import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { createArchiveQueue, createArchiveWorker } from '../jobs/archive-journaliere.js'

const plugin: FastifyPluginAsync = async (app) => {
  const connection = { host: app.redis.options.host ?? 'localhost', port: app.redis.options.port ?? 6379 }

  const archiveQueue = createArchiveQueue(connection)
  const archiveWorker = createArchiveWorker(connection, app.db, app.log)

  archiveWorker.on('completed', (job) => app.log.info({ jobId: job.id }, 'archive-journaliere terminée'))
  archiveWorker.on('failed', (job, err) => app.log.error({ jobId: job?.id, err }, 'archive-journaliere échouée'))

  // Job répétable : chaque jour à 01h00 UTC (archive la veille)
  await archiveQueue.upsertJobScheduler(
    'archive-quotidienne',
    { pattern: '0 1 * * *' },
    { name: 'archive-journaliere', data: {} },
  )

  app.addHook('onClose', async () => {
    await archiveWorker.close()
    await archiveQueue.close()
  })
}

export const queuePlugin = fp(plugin, { name: 'queue', dependencies: ['redis', 'prisma'] })
