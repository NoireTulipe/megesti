import type { PrismaClient } from '@prisma/client'
import { getPdpService } from '../services/SuperPdpService.js'

// Événements SuperPDP → StatutFactureEmission
const STATUT_MAP: Record<string, 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'> = {
  'fr:212': 'ACCEPTEE',  // acceptée / encaissée
  'fr:220': 'REFUSEE',   // refusée
  'fr:317': 'ANNULEE',   // annulée
}

/**
 * Job BullMQ — poll de GET /v1.beta/invoice_events pour mettre à jour
 * le statut des FactureEmission. 1 seul appel API (paginé) pour tous les tenants,
 * au lieu de N appels individuels par facture ENVOYEE.
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollStatutsEmissions(db: PrismaClient): Promise<void> {
  let pdp: ReturnType<typeof getPdpService>
  try { pdp = getPdpService() } catch {
    console.warn('[pollStatuts] SUPERPDP_CLIENT_ID/SECRET manquants — polling ignoré')
    return
  }

  // Récupère le dernier event_id traité (global, pas par tenant car compte MeGesti unique)
  const meta = await db.tenant.findFirst({
    where:  { actif: true },
    select: { pdpLastEventId: true },
  })
  const sinceId = meta?.pdpLastEventId ?? undefined

  const evenements = await pdp.listerEvenements(sinceId)
  if (!evenements.length) return

  let dernierEventId = sinceId

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

    // Retrouve la FactureEmission correspondante
    const facture = await db.factureEmission.findFirst({
      where: { pdpId, statut: 'ENVOYEE' },
    })
    if (!facture) continue

    await db.factureEmission.update({
      where: { id: facture.id },
      data:  { statut: nouveauStatut },
    })
    console.log(`[pollStatuts] facture=${facture.id} pdpId=${pdpId} → ${nouveauStatut}`)
  }

  // Persiste le dernier eventId sur tous les tenants actifs (compte global)
  if (dernierEventId && dernierEventId !== sinceId) {
    await db.tenant.updateMany({
      where: { actif: true },
      data:  { pdpLastEventId: dernierEventId },
    })
  }
}
