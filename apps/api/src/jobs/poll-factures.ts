import type { PrismaClient } from '@prisma/client'
import { createPdpService } from '../services/SuperPdpService.js'

/**
 * Job BullMQ — polling des factures reçues pour tous les tenants configurés.
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollFactures(db: PrismaClient): Promise<void> {
  const tenants = await db.tenant.findMany({
    where: {
      actif:          true,
      pdpClientId:    { not: null },
      pdpClientSecret:{ not: null },
    },
    select: {
      id:              true,
      pdpClientId:     true,
      pdpClientSecret: true,
      pdpLastInvoiceId:true,
    },
  })

  for (const tenant of tenants) {
    if (!tenant.pdpClientId || !tenant.pdpClientSecret) continue

    try {
      const pdp       = createPdpService(tenant.pdpClientId, tenant.pdpClientSecret)
      const factures  = await pdp.listerRecu(tenant.pdpLastInvoiceId ?? undefined)

      if (!factures.length) continue

      let lastId = tenant.pdpLastInvoiceId

      for (const f of factures) {
        // Évite les doublons
        const exists = await db.factureReception.findUnique({
          where: { tenantId_pdpId: { tenantId: tenant.id, pdpId: f.id } },
        })
        if (exists) continue

        await db.factureReception.create({
          data: {
            tenantId:     tenant.id,
            pdpId:        f.id,
            emetteurNom:  String(f.sender_name  ?? ''),
            emetteurSiret:String(f.sender_siren ?? ''),
            montantTTC:   Number(f.total_amount ?? 0),
            dateReception: new Date(f.created_at),
            statut:       'RECUE',
          },
        })

        // Mémorise le dernier ID pour le prochain polling
        if (!lastId || f.id > lastId) lastId = f.id
      }

      if (lastId && lastId !== tenant.pdpLastInvoiceId) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { pdpLastInvoiceId: lastId },
        })
      }
    } catch (err: unknown) {
      // Log sans bloquer les autres tenants
      console.error(`[pollFactures] tenant=${tenant.id} erreur:`, (err as Error).message)
    }
  }
}
