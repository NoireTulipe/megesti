import { Worker, Queue, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'

export const QUEUE_NAME = 'archive-journaliere'

export interface ArchiveJobData {
  date?: string // ISO date YYYY-MM-DD — pour backfill manuel ; sinon hier
}

export function createArchiveQueue(connection: ConnectionOptions) {
  return new Queue<ArchiveJobData>(QUEUE_NAME, { connection })
}

export function createArchiveWorker(
  connection: ConnectionOptions,
  db: PrismaClient,
  log: FastifyBaseLogger,
) {
  return new Worker<ArchiveJobData>(
    QUEUE_NAME,
    async (job) => {
      // date explicite pour les jobs manuels (backfill), sinon hier
      const dateBase = job.data.date ? new Date(job.data.date) : (() => {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - 1)
        return d
      })()
      const debutJour = new Date(dateBase)
      debutJour.setUTCHours(0, 0, 0, 0)
      const finJour = new Date(dateBase)
      finJour.setUTCHours(23, 59, 59, 999)

      const tenants = await db.tenant.findMany({ select: { id: true } })

      for (const tenant of tenants) {
        const agg = await db.vente.aggregate({
          where: {
            tenantId: tenant.id,
            statut: 'VALIDEE',
            dateVente: { gte: debutJour, lte: finJour },
          },
          _count: true,
          _sum: { totalTTC: true },
          _max: { numero: true },
        })

        if (agg._count === 0) continue

        const derniereVente = await db.vente.findFirst({
          where: {
            tenantId: tenant.id,
            statut: 'VALIDEE',
            dateVente: { gte: debutJour, lte: finJour },
          },
          orderBy: { numero: 'desc' },
          select: { hash: true, numero: true },
        })

        if (!derniereVente?.hash) continue

        await db.archiveJournaliere.upsert({
          where: { tenantId_dateArchive: { tenantId: tenant.id, dateArchive: debutJour } },
          update: {},
          create: {
            tenantId:      tenant.id,
            dateArchive:   debutJour,
            totalVentes:   agg._count,
            totalTTC:      agg._sum.totalTTC ?? 0,
            dernierHash:   derniereVente.hash,
            dernierNumero: derniereVente.numero,
          },
        })

        log.info({ tenantId: tenant.id, date: job.data.date, totalVentes: agg._count }, 'archive journalière créée')
      }
    },
    { connection },
  )
}
