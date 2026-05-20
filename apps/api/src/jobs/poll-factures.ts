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

        // Télécharge le contenu complet (JSON SuperPDP) pour archivage et affichage
        let contenuXml: string | null = null
        let emetteurNom   = String(f.sender_name  ?? '')
        let emetteurSiret = String(f.sender_siren ?? '')
        let montantTTC    = Number(f.total_amount  ?? 0)

        try {
          contenuXml = await pdp.telecharger(pdpId)
          // L'API SuperPDP propriétaire retourne le JSON complet dans telecharger()
          const data = JSON.parse(contenuXml) as Record<string, unknown>
          const inv  = (data['en_invoice'] ?? data) as Record<string, unknown>
          const seller  = inv['seller']  as Record<string, unknown> | undefined
          const totals  = inv['totals']  as Record<string, unknown> | undefined
          const tvaAmt  = totals?.['total_vat_amount'] as Record<string, unknown> | undefined
          if (seller?.['name'])          emetteurNom   = String(seller['name'])
          const ids = seller?.['identifiers'] as Array<Record<string, unknown>> | undefined
          if (ids?.[0]?.['value'])       emetteurSiret = String(ids[0]['value'])
          const ttc = totals?.['total_with_vat'] ?? totals?.['amount_due_for_payment'] ?? tvaAmt?.['value']
          if (ttc) montantTTC = parseFloat(String(ttc)) || montantTTC
        } catch { /* non bloquant — on garde les valeurs de la liste */ }

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
