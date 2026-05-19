import { Worker, Queue, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import { pollAfnor } from './poll-afnor.js'

export const AFNOR_QUEUE_NAME = 'poll-afnor'

export function createPollAfnorQueue(connection: ConnectionOptions) {
  return new Queue(AFNOR_QUEUE_NAME, { connection })
}

export function createPollAfnorWorker(
  connection: ConnectionOptions,
  db:         PrismaClient,
  log:        FastifyBaseLogger,
) {
  return new Worker(AFNOR_QUEUE_NAME, async () => {
    log.info('Polling AFNOR flows…')
    await pollAfnor(db)
    log.info('Polling AFNOR terminé')
  }, { connection })
}
