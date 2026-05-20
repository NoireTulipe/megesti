import type { PrismaClient } from '@prisma/client'
import { getPdpService } from '../services/SuperPdpService.js'

// ── Extraction des infos clés depuis JSON SuperPDP, UBL ou CII ────────────────

interface InfosFacture { nom: string; siret: string; montant: number }

function extraireInfosFacture(contenu: string): InfosFacture {
  const vide: InfosFacture = { nom: '', siret: '', montant: 0 }
  if (!contenu) return vide

  try {
    // ── 1. JSON SuperPDP (en_invoice) ──────────────────────────────────────────
    if (contenu.trimStart().startsWith('{')) {
      const data = JSON.parse(contenu) as Record<string, unknown>
      const inv  = (data['en_invoice'] ?? data) as Record<string, unknown>
      const seller = inv['seller'] as Record<string, unknown> | undefined
      const totals = inv['totals'] as Record<string, unknown> | undefined
      const tvaAmt = totals?.['total_vat_amount'] as Record<string, unknown> | undefined
      const ids    = seller?.['identifiers'] as Array<Record<string, unknown>> | undefined
      const ttcRaw = totals?.['total_with_vat'] ?? totals?.['amount_due_for_payment'] ?? tvaAmt?.['value']
      return {
        nom:     String(seller?.['name'] ?? ''),
        siret:   String(ids?.[0]?.['value'] ?? ''),
        montant: parseFloat(String(ttcRaw ?? '0')) || 0,
      }
    }
  } catch { /* pas du JSON */ }

  // ── 2. UBL : <RegistrationName> dans SupplierParty + <TaxInclusiveAmount> ──
  const ublSellerName = contenu.match(
    /<[^>]*AccountingSupplierParty[^>]*>[\s\S]*?<[^>]*RegistrationName[^>]*>(.*?)<\/[^>]*RegistrationName>/
  )?.[1]
  const ublTotal = contenu.match(/<[^>]*TaxInclusiveAmount[^>]*>([\d.]+)</)?.[1]

  // ── 3. CII : <ram:Name> dans SellerTradeParty + <GrandTotalAmount> ─────────
  const ciiSellerName = contenu.match(
    /<[^>]*SellerTradeParty[^>]*>[\s\S]*?<[^>]*Name[^>]*>(.*?)<\/[^>]*Name>/
  )?.[1]
  const ciiTotal = contenu.match(/<[^>]*GrandTotalAmount[^>]*>([\d.]+)</)?.[1]

  // Identifiant vendeur UBL/CII : schemeID="0225" dans supplier section
  const sellerId = contenu.match(
    /<[^>]*AccountingSupplierParty[^>]*>[\s\S]*?schemeID="0225"[^>]*>(.*?)<\/|<[^>]*SellerTradeParty[^>]*>[\s\S]*?schemeID="0225"[^>]*>(.*?)<\//
  )

  return {
    nom:     ublSellerName ?? ciiSellerName ?? '',
    siret:   sellerId?.[1] ?? sellerId?.[2] ?? '',
    montant: parseFloat(ublTotal ?? ciiTotal ?? '0') || 0,
  }
}

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
