import { Worker, Queue, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import { pollFactures } from './poll-factures.js'

export const QUEUE_NAME = 'poll-factures'

export function createPollFacturesQueue(connection: ConnectionOptions) {
  return new Queue(QUEUE_NAME, { connection })
}

export function createPollFacturesWorker(
  connection: ConnectionOptions,
  db:         PrismaClient,
  log:        FastifyBaseLogger,
) {
  return new Worker(QUEUE_NAME, async () => {
    log.info('Polling factures reçues…')
    await pollFactures(db)
    log.info('Polling factures terminé')
  }, { connection })
}
