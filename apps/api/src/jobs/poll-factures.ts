import type { PrismaClient } from '@prisma/client'
import { getPdpService } from '../services/SuperPdpService.js'

/**
 * Job BullMQ — polling des factures reçues pour tous les tenants configurés.
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollFactures(db: PrismaClient): Promise<void> {
  // Vérifie que les credentials MeGesti sont configurés
  let pdp: ReturnType<typeof getPdpService>
  try { pdp = getPdpService() } catch {
    console.warn('[pollFactures] SUPERPDP_CLIENT_ID/SECRET manquants — polling ignoré')
    return
  }

  const tenants = await db.tenant.findMany({
    where:  { actif: true },
    select: { id: true, pdpLastInvoiceId: true, siret: true },
  })

  for (const tenant of tenants) {
    if (!tenant.siret) continue

    try {
      const factures = await pdp.listerRecu(tenant.pdpLastInvoiceId ?? undefined)
      if (!factures.length) continue

      let lastId = tenant.pdpLastInvoiceId

      for (const f of factures) {
        const pdpId = String(f.id)

        const exists = await db.factureReception.findUnique({
          where: { tenantId_pdpId: { tenantId: tenant.id, pdpId } },
        })
        if (exists) continue

        // Télécharge le XML brut pour archivage 10 ans (obligation légale)
        let contenuXml: string | null = null
        try { contenuXml = await pdp.telecharger(pdpId) } catch { /* non bloquant */ }

        await db.factureReception.create({
          data: {
            tenantId:      tenant.id,
            pdpId,
            emetteurNom:   String(f.sender_name  ?? ''),
            emetteurSiret: String(f.sender_siren ?? ''),
            montantTTC:    Number(f.total_amount ?? 0),
            dateReception: new Date(f.created_at),
            statut:        'RECUE',
            contenuXml,
          },
        })

        // Mémorise le plus grand ID (bigint stocké en string — comparaison numérique)
        if (!lastId || BigInt(pdpId) > BigInt(lastId)) lastId = pdpId
      }

      if (lastId && lastId !== tenant.pdpLastInvoiceId) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { pdpLastInvoiceId: lastId },
        })
      }
    } catch (err: unknown) {
      console.error(`[pollFactures] tenant=${tenant.id} erreur:`, (err as Error).message)
    }
  }
}
