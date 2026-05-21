import type { PrismaClient } from '@prisma/client'
import { getAfnorService, siretToSiren } from '../services/AfnorFlowService.js'
import type { AfnorFlow } from '../services/AfnorFlowService.js'

/**
 * Job BullMQ — polling AFNOR Flow API.
 * Remplace poll-factures.ts et poll-statuts-emissions.ts quand PDP_MODE=afnor.
 *
 * Par tenant (grâce à Organization-Id = SIREN) :
 *  - SupplierInvoice In  → factures reçues
 *  - CustomerInvoice Out → pre-check failures sur nos émissions
 *  - CustomerInvoiceLC In → lifecycle (accusés de réception acheteur)
 */
export async function pollAfnor(db: PrismaClient): Promise<void> {
  let afnor: ReturnType<typeof getAfnorService>
  try { afnor = getAfnorService() } catch (e) {
    console.warn('[pollAfnor] service indisponible:', (e as Error).message)
    return
  }

  const tenants = await db.tenant.findMany({
    where:  { actif: true, siret: { not: null } },
    select: { id: true, siret: true, pdpAfnorSyncAt: true },
  })

  for (const tenant of tenants) {
    if (!tenant.siret) continue
    const siren = siretToSiren(tenant.siret)
    const since = tenant.pdpAfnorSyncAt ?? undefined
    let maxUpdatedAt: Date | undefined = since
    console.log(`[pollAfnor] tenant=${tenant.id} siren=${siren} since=${since?.toISOString() ?? 'début'}`)

    function trackUpdatedAt(flows: AfnorFlow[]) {
      for (const f of flows) {
        const t = new Date(f.updatedAt)
        if (!maxUpdatedAt || t > maxUpdatedAt) maxUpdatedAt = t
      }
    }

    try {
      // ── 1. Factures reçues ───────────────────────────────────────────────
      const recues = await afnor.rechercherFlows(siren, ['SupplierInvoice'], ['In'], since)
      console.log(`[pollAfnor] SupplierInvoice In : ${recues.length} flow(s) trouvé(s)`)
      trackUpdatedAt(recues)

      for (const flow of recues) {
        console.log(`[pollAfnor] flow flowId=${flow.flowId} ack=${flow.acknowledgement?.status}`)
        if (flow.flowId.startsWith('i_')) continue

        const exists = await db.factureReception.findUnique({
          where: { tenantId_pdpId: { tenantId: tenant.id, pdpId: flow.flowId } },
        })
        if (exists) { console.log(`[pollAfnor] déjà en base, skip`); continue }

        let xml: string | null = null
        try {
          xml = await afnor.telecharger(flow.flowId, siren)
          console.log(`[pollAfnor] contenu téléchargé (${xml.length} chars) : ${xml.substring(0, 120)}…`)
        } catch (e) {
          console.error(`[pollAfnor] téléchargement échoué:`, (e as Error).message)
        }

        await db.factureReception.create({
          data: {
            tenantId:      tenant.id,
            pdpId:         flow.flowId,
            emetteurNom:   '',   // TODO: extraire du XML (contenuXml)
            emetteurSiret: '',
            montantTTC:    0,
            dateReception: new Date(flow.submittedAt),
            statut:        'RECUE',
            contenuXml:    xml,
          },
        })
        console.log(`[pollAfnor] reçue flowId=${flow.flowId} tenant=${tenant.id}`)
      }

      // ── 2. Pre-check failures sur nos émissions ───────────────────────────
      const emises = await afnor.rechercherFlows(siren, ['CustomerInvoice'], ['Out'], since)
      trackUpdatedAt(emises)

      for (const flow of emises) {
        if (flow.acknowledgement.status !== 'Rejected') continue
        if (!flow.trackingId) continue
        const facture = await db.factureEmission.findFirst({
          where: { tenantId: tenant.id, numero: flow.trackingId, statut: 'ENVOYEE' },
        })
        if (!facture) continue
        await db.factureEmission.update({
          where: { id: facture.id },
          data:  { statut: 'REFUSEE' },
        })
        console.log(`[pollAfnor] pre-check rejected: ${facture.numero}`)
      }

      // ── 3. Lifecycle acheteur (CDAR) ──────────────────────────────────────
      const lcs = await afnor.rechercherFlows(siren, ['CustomerInvoiceLC'], ['In'], since)
      trackUpdatedAt(lcs)

      for (const lc of lcs) {
        if (!lc.trackingId) continue
        const facture = await db.factureEmission.findFirst({
          where: { tenantId: tenant.id, numero: lc.trackingId, statut: 'ENVOYEE' },
        })
        if (!facture) continue

        // Ack Accepted = facture acceptée techniquement (routage OK)
        // Pour l'acceptation / refus métier, le CDAR lui-même doit être parsé (TODO)
        if (lc.acknowledgement.status === 'Accepted') {
          await db.factureEmission.update({
            where: { id: facture.id },
            data:  { statut: 'ACCEPTEE' },
          })
          console.log(`[pollAfnor] LC acceptée: ${facture.numero}`)
        } else if (lc.acknowledgement.status === 'Rejected') {
          await db.factureEmission.update({
            where: { id: facture.id },
            data:  { statut: 'REFUSEE' },
          })
          console.log(`[pollAfnor] LC refusée: ${facture.numero}`)
        }
      }

      // ── Avance le curseur ─────────────────────────────────────────────────
      if (maxUpdatedAt && maxUpdatedAt !== since) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { pdpAfnorSyncAt: maxUpdatedAt },
        })
      }

    } catch (err: unknown) {
      console.error(`[pollAfnor] tenant=${tenant.id} erreur:`, (err as Error).message)
    }
  }
}
