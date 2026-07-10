import type { PrismaClient } from '@prisma/client'
import { getPdpServiceForTenant } from '../services/SuperPdpService.js'

// Événements SuperPDP → StatutFactureEmission
const STATUT_MAP: Record<string, 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'> = {
  'fr:212': 'ACCEPTEE',  // acceptée / encaissée
  'fr:220': 'REFUSEE',   // refusée
  'fr:317': 'ANNULEE',   // annulée
}

/**
 * Job BullMQ — polling des invoice_events SuperPDP par tenant.
 * Chaque tenant a son propre flux d'événements (credentials OAuth distincts).
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollStatutsEmissions(db: PrismaClient): Promise<void> {
  // Récupère TOUS les tenants actifs et configurés en facturation électronique
  const tenants = await db.tenant.findMany({
    where:  { actif: true, pdpStatut: 'ACTIF' },
    select: { id: true, pdpLastEventId: true },
  })

  for (const tenant of tenants) {
    try {
      const pdp = await getPdpServiceForTenant(db, tenant.id)

      // Poll des événements pour ce tenant
      const evenements = await pdp.listerEvenements(tenant.pdpLastEventId ?? undefined)
      if (!evenements.length) continue

      let dernierEventId = tenant.pdpLastEventId

      for (const evt of evenements) {
        const eventId   = String(evt.id)
        const pdpId     = String(evt.invoice_id)
        const statutPdp = evt.status_code

        // Avance le curseur
        if (!dernierEventId || BigInt(eventId) > BigInt(dernierEventId)) {
          dernierEventId = eventId
        }

        const nouveauStatut = STATUT_MAP[statutPdp]
        if (!nouveauStatut) continue

        // Retrouve la FactureEmission correspondante (avec vérification du tenant)
        const facture = await db.factureEmission.findFirst({
          where: { tenantId: tenant.id, pdpId, statut: 'ENVOYEE' },
        })
        if (!facture) continue

        await db.factureEmission.update({
          where: { id: facture.id },
          data:  { statut: nouveauStatut },
        })
        console.log(`[pollStatuts] tenant=${tenant.id} facture=${facture.id} pdpId=${pdpId} → ${nouveauStatut}`)
      }

      // Persiste le curseur pour ce tenant (par tenant, pas updateMany global)
      if (dernierEventId && dernierEventId !== tenant.pdpLastEventId) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { pdpLastEventId: dernierEventId },
        })
      }
    } catch (err: unknown) {
      console.error(`[pollStatuts] tenant=${tenant.id} erreur:`, (err as Error).message)
    }
  }
}
