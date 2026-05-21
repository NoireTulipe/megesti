import type { PrismaClient } from '@prisma/client'
import { getPdpService } from '../services/SuperPdpService.js'
import { isAfnorEnabled } from '../services/AfnorFlowService.js'
import { extraireInfosFacture } from './parse-facture.js'


/**
 * Job BullMQ — polling des factures reçues pour tous les tenants configurés.
 * Fréquence recommandée : toutes les 5 minutes.
 */
export async function pollFactures(db: PrismaClient): Promise<void> {
  // En mode AFNOR, poll-afnor.ts gère la réception — on ne duplique pas
  if (isAfnorEnabled()) return

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

        // Ignore les doublons préfixés "i_" (même facture, vue destinataire vs réseau)
        if (pdpId.startsWith('i_')) continue

        const exists = await db.factureReception.findUnique({
          where: { tenantId_pdpId: { tenantId: tenant.id, pdpId } },
        })
        if (exists) continue

        // Télécharge le contenu pour archivage et extraction des données
        let contenuXml: string | null = null
        let emetteurNom   = String(f.sender_name  ?? '')
        let emetteurSiret = String(f.sender_siren ?? '')
        let montantTTC    = Number(f.total_amount  ?? 0)

        try {
          contenuXml = await pdp.telecharger(pdpId)
          const extracted = extraireInfosFacture(contenuXml)
          if (extracted.nom)     emetteurNom   = extracted.nom
          if (extracted.siret)   emetteurSiret = extracted.siret
          if (extracted.montant) montantTTC    = extracted.montant
        } catch { /* non bloquant */ }

        await db.factureReception.create({
          data: {
            tenantId:      tenant.id,
            pdpId,
            emetteurNom,
            emetteurSiret,
            montantTTC,
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
