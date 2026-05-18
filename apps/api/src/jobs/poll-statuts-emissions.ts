import type { PrismaClient } from '@prisma/client'
import { getPdpService } from '../services/SuperPdpService.js'

// Correspondance statuts SuperPDP → StatutFactureEmission
const STATUT_MAP: Record<string, string> = {
  'fr:210': 'ENVOYEE',   // reçue par le destinataire
  'fr:211': 'ENVOYEE',   // en cours de traitement
  'fr:212': 'ACCEPTEE',  // acceptée / encaissée
  'fr:220': 'REFUSEE',   // refusée
}

function mapStatut(pdpStatut: string): string | null {
  return STATUT_MAP[pdpStatut] ?? null
}

/**
 * Job BullMQ — vérifie le statut SuperPDP des factures encore en attente (ENVOYEE).
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollStatutsEmissions(db: PrismaClient): Promise<void> {
  let pdp: ReturnType<typeof getPdpService>
  try { pdp = getPdpService() } catch {
    console.warn('[pollStatuts] SUPERPDP_CLIENT_ID/SECRET manquants — polling ignoré')
    return
  }

  // Factures émises encore en attente de réponse
  const enAttente = await db.factureEmission.findMany({
    where: {
      statut: 'ENVOYEE',
      pdpId:  { not: null },
    },
    select: { id: true, pdpId: true, tenantId: true },
  })

  if (!enAttente.length) return

  for (const facture of enAttente) {
    if (!facture.pdpId) continue
    try {
      const { statut: pdpStatut } = await pdp.getStatutEmis(facture.pdpId)
      const nouveauStatut = mapStatut(pdpStatut)

      if (nouveauStatut && nouveauStatut !== 'ENVOYEE') {
        await db.factureEmission.update({
          where: { id: facture.id },
          data:  { statut: nouveauStatut as 'ACCEPTEE' | 'REFUSEE' },
        })
        console.log(`[pollStatuts] facture=${facture.id} → ${nouveauStatut}`)
      }
    } catch (err: unknown) {
      console.error(`[pollStatuts] facture=${facture.id} erreur:`, (err as Error).message)
    }
  }
}
