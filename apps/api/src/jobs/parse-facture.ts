// Extraction des infos clés depuis JSON SuperPDP, UBL ou CII
// Utilisé par poll-factures.ts et poll-afnor.ts

export interface InfosFacture { nom: string; siret: string; montant: number }

export function extraireInfosFacture(contenu: string): InfosFacture {
  const vide: InfosFacture = { nom: '', siret: '', montant: 0 }
  if (!contenu) return vide

  // ── JSON SuperPDP ──────────────────────────────────────────────────────────
  if (contenu.trimStart().startsWith('{')) {
    try {
      const data = JSON.parse(contenu) as Record<string, unknown>
      const inv  = (data['en_invoice'] ?? data) as Record<string, unknown>
      const seller = inv['seller']  as Record<string, unknown> | undefined
      const totals = inv['totals']  as Record<string, unknown> | undefined
      const tvaAmt = totals?.['total_vat_amount'] as Record<string, unknown> | undefined
      const ids    = seller?.['identifiers'] as Array<Record<string, unknown>> | undefined
      const ttcRaw = totals?.['total_with_vat'] ?? totals?.['amount_due_for_payment'] ?? tvaAmt?.['value']
      return {
        nom:     String(seller?.['name'] ?? ''),
        siret:   String(ids?.[0]?.['value'] ?? ''),
        montant: parseFloat(String(ttcRaw ?? '0')) || 0,
      }
    } catch { /* pas du JSON */ }
  }

  // ── Helpers XML ────────────────────────────────────────────────────────────
  const pick = (xml: string, tagName: string): string => {
    const m = xml.match(new RegExp(`<(?:[a-zA-Z]+:)?${tagName}(?:\\s[^>]*)?>([^<]*)`, 'i'))
    return m?.[1]?.trim() ?? ''
  }

  // ── UBL ────────────────────────────────────────────────────────────────────
  if (contenu.includes('<Invoice') || contenu.includes('ubl:Invoice')) {
    const sellerB = contenu.match(/<[^>]*AccountingSupplierParty[^>]*>([\s\S]*?)<\/[^>]*AccountingSupplierParty>/)?.[1] ?? ''
    return {
      nom:     pick(sellerB, 'RegistrationName') || pick(sellerB, 'Name'),
      siret:   '',
      montant: parseFloat(pick(contenu, 'TaxInclusiveAmount') || pick(contenu, 'PayableAmount')) || 0,
    }
  }

  // ── CII ────────────────────────────────────────────────────────────────────
  if (contenu.includes('CrossIndustryInvoice')) {
    const sellerB = contenu.match(/<[^>]*SellerTradeParty[^>]*>([\s\S]*?)<\/[^>]*SellerTradeParty>/)?.[1] ?? ''
    const summB   = contenu.match(/<[^>]*SpecifiedTradeSettlementHeaderMonetarySummation[^>]*>([\s\S]*?)<\/[^>]*SpecifiedTradeSettlementHeaderMonetarySummation>/)?.[1] ?? ''
    return {
      nom:     pick(sellerB, 'Name'),
      siret:   '',
      montant: parseFloat(pick(summB, 'GrandTotalAmount') || pick(summB, 'DuePayableAmount')) || 0,
    }
  }

  return vide
}
