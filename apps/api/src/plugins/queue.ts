import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { createArchiveQueue, createArchiveWorker } from '../jobs/archive-journaliere.js'
import { createPollFacturesQueue, createPollFacturesWorker } from '../jobs/poll-factures-job.js'

const plugin: FastifyPluginAsync = async (app) => {
  const connection = { host: app.redis.options.host ?? 'localhost', port: app.redis.options.port ?? 6379 }

  // ── Archive journalière (TVA anti-fraude) ──────────────────────────────────
  const archiveQueue  = createArchiveQueue(connection)
  const archiveWorker = createArchiveWorker(connection, app.db, app.log)

  archiveWorker.on('completed', (job) => app.log.info({ jobId: job.id }, 'archive-journaliere terminée'))
  archiveWorker.on('failed', (job, err) => app.log.error({ jobId: job?.id, err }, 'archive-journaliere échouée'))

  await archiveQueue.upsertJobScheduler(
    'archive-quotidienne',
    { pattern: '0 1 * * *' },
    { name: 'archive-journaliere', data: {} },
  )

  // ── Polling factures reçues (superpdp) — toutes les 5 minutes ─────────────
  const pollQueue  = createPollFacturesQueue(connection)
  const pollWorker = createPollFacturesWorker(connection, app.db, app.log)

  pollWorker.on('failed', (job, err) => app.log.error({ jobId: job?.id, err }, 'poll-factures échoué'))

  await pollQueue.upsertJobScheduler(
    'poll-factures-recurrents',
    { every: 5 * 60 * 1000 },  // toutes les 5 minutes
    { name: 'poll-factures', data: {} },
  )

  app.addHook('onClose', async () => {
    await archiveWorker.close()
    await archiveQueue.close()
    await pollWorker.close()
    await pollQueue.close()
  })
}

export const queuePlugin = fp(plugin, { name: 'queue', dependencies: ['redis', 'prisma'] })
