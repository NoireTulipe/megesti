import { XMLParser } from 'fast-xml-parser'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LigneFactureParsee {
  id:      string
  nom:     string
  qte:     number
  unite:   string   // 'kg', 'unité', 'h'…
  prixUHT: number
  tauxTVA: number
  totalHT: number
}

export interface TvaDetail {
  taux:    number
  baseHT:  number
  montant: number
}

export interface PartieFacture {
  nom:    string
  ref?:   string   // SIREN / identifiant Peppol
  tvaId?: string   // numéro TVA intracommunautaire
}

export interface FactureParsee {
  format:        'ubl' | 'cii' | 'json' | 'inconnu'
  numero:        string
  dateEmission?: string   // YYYY-MM-DD
  dateEcheance?: string
  emetteur:      PartieFacture
  destinataire:  PartieFacture
  lignes:        LigneFactureParsee[]
  tvaDetails:    TvaDetail[]
  montantHT:     number
  montantTVA:    number
  montantTTC:    number
  notes:         string[]
}

// ── Codes unités UN/CEFACT → libellé lisible ──────────────────────────────────

const UNITES: Record<string, string> = {
  C62: 'unité', KGM: 'kg', GRM: 'g', LTR: 'L', MTR: 'm',
  MTK: 'm²', MTQ: 'm³', HUR: 'h', DAY: 'j', MON: 'mois',
  ANN: 'an', SET: 'lot', PCE: 'pièce', NMP: 'paquet',
}
function unite(code: string | undefined): string {
  return code ? (UNITES[code.toUpperCase()] ?? code) : ''
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: unknown): number {
  const s = typeof v === 'object' && v !== null ? (v as Record<string,'#text'>)['#text'] ?? String(v) : String(v ?? '')
  return parseFloat(s) || 0
}

function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return (v as Record<string, unknown>)['#text'] as string ?? ''
  return String(v)
}

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? v : [v]
}

// ── Parseur XML commun ────────────────────────────────────────────────────────

const PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  textNodeName:        '#text',
  removeNSPrefix:      true,    // ram:Name → Name, cbc:ID → ID
  parseTagValue:       false,   // garde "000000001" comme string, pas 1
  parseAttributeValue: false,   // idem pour les attributs
  isArray: (name) => [
    'InvoiceLine', 'TaxSubtotal', 'Note',
    'IncludedSupplyChainTradeLineItem', 'ApplicableTradeTax',
    'PartyIdentification',
  ].includes(name),
})

// ── Parseur UBL ───────────────────────────────────────────────────────────────

function parseUbl(raw: string): FactureParsee {
  const doc  = PARSER.parse(raw)
  const inv  = doc['Invoice'] ?? {}

  // Parties
  const supB = inv['AccountingSupplierParty']?.['Party'] ?? {}
  const cusB = inv['AccountingCustomerParty']?.['Party'] ?? {}
  const supLegal = supB['PartyLegalEntity'] ?? {}
  const cusLegal = cusB['PartyLegalEntity'] ?? {}

  // TVA subtotals
  const taxTotal = inv['TaxTotal'] ?? {}
  const tvaDetails: TvaDetail[] = arr(taxTotal['TaxSubtotal']).map(sub => ({
    taux:    n(sub['TaxCategory']?.['Percent']),
    baseHT:  n(sub['TaxableAmount']),
    montant: n(sub['TaxAmount']),
  }))

  // Totaux
  const lmt = inv['LegalMonetaryTotal'] ?? {}

  // Lignes
  const lignes: LigneFactureParsee[] = arr(inv['InvoiceLine']).map(l => ({
    id:      s(l['ID']),
    nom:     s(l['Item']?.['Name']) || s(l['Item']?.['Description']),
    qte:     n(l['InvoicedQuantity']),
    unite:   unite(l['InvoicedQuantity']?.['@_unitCode']),
    prixUHT: n(l['Price']?.['PriceAmount']),
    tauxTVA: n(l['Item']?.['ClassifiedTaxCategory']?.['Percent']),
    totalHT: n(l['LineExtensionAmount']),
  }))

  // Notes (UBL stocke les notes comme "#PMT#texte" ou directement)
  const rawNotes = arr<unknown>(inv['Note']).map(nd => {
    const t = s(nd)
    return t.replace(/^#[A-Z]+#/, '').trim()
  }).filter(Boolean)

  return {
    format:        'ubl',
    numero:        s(inv['ID']),
    dateEmission:  s(inv['IssueDate']),
    dateEcheance:  s(inv['DueDate']),
    emetteur: {
      nom:    s(supLegal['RegistrationName']) || s(supB['PartyName']?.['Name']),
      ref:    s(supLegal['CompanyID']) || s(arr(supB['PartyIdentification'])[0]?.['ID']),
      tvaId:  s(supB['PartyTaxScheme']?.['CompanyID']),
    },
    destinataire: {
      nom:    s(cusLegal['RegistrationName']) || s(cusB['PartyName']?.['Name']),
      ref:    s(cusLegal['CompanyID']) || s(arr(cusB['PartyIdentification'])[0]?.['ID']),
      tvaId:  s(cusB['PartyTaxScheme']?.['CompanyID']),
    },
    lignes,
    tvaDetails,
    montantHT:  n(lmt['TaxExclusiveAmount']),
    montantTVA: n(taxTotal['TaxAmount']),
    montantTTC: n(lmt['TaxInclusiveAmount']) || n(lmt['PayableAmount']),
    notes:      rawNotes,
  }
}

// ── Parseur CII ───────────────────────────────────────────────────────────────

function parseCii(raw: string): FactureParsee {
  const doc  = PARSER.parse(raw)
  const root = doc['CrossIndustryInvoice'] ?? {}

  const exDoc  = root['ExchangedDocument'] ?? {}
  const trans  = root['SupplyChainTradeTransaction'] ?? {}
  const agree  = trans['ApplicableHeaderTradeAgreement'] ?? {}
  const settle = trans['ApplicableHeaderTradeSettlement'] ?? {}
  const summ   = settle['SpecifiedTradeSettlementHeaderMonetarySummation'] ?? {}

  const seller = agree['SellerTradeParty'] ?? {}
  const buyer  = agree['BuyerTradeParty']  ?? {}

  // Date format CII : YYYYMMDD → YYYY-MM-DD
  const ciiDate = (v: unknown): string => {
    const raw2 = s(v)
    return raw2.length === 8 ? `${raw2.slice(0,4)}-${raw2.slice(4,6)}-${raw2.slice(6,8)}` : raw2
  }

  // TVA header (ApplicableTradeTax au niveau settlement, avec BasisAmount)
  const tvaDetails: TvaDetail[] = arr(settle['ApplicableTradeTax'])
    .filter(t => t['BasisAmount'] !== undefined)
    .map(t => ({
      taux:    n(t['RateApplicablePercent']),
      baseHT:  n(t['BasisAmount']),
      montant: n(t['CalculatedAmount']),
    }))

  // Lignes
  const lignes: LigneFactureParsee[] = arr(trans['IncludedSupplyChainTradeLineItem']).map(l => {
    const prod    = l['SpecifiedTradeProduct'] ?? {}
    const deliv   = l['SpecifiedLineTradeDelivery'] ?? {}
    const lineSet = l['SpecifiedLineTradeSettlement'] ?? {}
    const lineSum = lineSet['SpecifiedTradeSettlementLineMonetarySummation'] ?? {}
    const lineTax = arr(lineSet['ApplicableTradeTax'])[0] ?? {}
    const price   = l['SpecifiedLineTradeAgreement']?.['NetPriceProductTradePrice'] ?? {}
    return {
      id:      s(l['AssociatedDocumentLineDocument']?.['LineID']),
      nom:     s(prod['Name']) || s(prod['Description']),
      qte:     n(deliv['BilledQuantity']),
      unite:   unite(deliv['BilledQuantity']?.['@_unitCode']),
      prixUHT: n(price['ChargeAmount']),
      tauxTVA: n(lineTax['RateApplicablePercent']),
      totalHT: n(lineSum['LineTotalAmount']),
    }
  })

  // Notes
  const notes = arr(exDoc['IncludedNote']).map(nd => s(nd['Content'])).filter(Boolean)

  return {
    format:        'cii',
    numero:        s(exDoc['ID']),
    dateEmission:  ciiDate(exDoc['IssueDateTime']?.['DateTimeString']),
    dateEcheance:  ciiDate(settle['SpecifiedTradePaymentTerms']?.['DueDateDateTime']?.['DateTimeString']),
    emetteur: {
      nom:    s(seller['Name']),
      ref:    s(seller['GlobalID']),
      tvaId:  s(arr(seller['SpecifiedTaxRegistration'])[0]?.['ID']),
    },
    destinataire: {
      nom:    s(buyer['Name']),
      ref:    s(buyer['GlobalID']),
      tvaId:  s(arr(buyer['SpecifiedTaxRegistration'])[0]?.['ID']),
    },
    lignes,
    tvaDetails,
    montantHT:  n(summ['TaxBasisTotalAmount']),
    montantTVA: n(summ['TaxTotalAmount']),
    montantTTC: n(summ['GrandTotalAmount']) || n(summ['DuePayableAmount']),
    notes,
  }
}

// ── Parseur JSON SuperPDP ─────────────────────────────────────────────────────

function parseJson(raw: string): FactureParsee {
  const data = JSON.parse(raw) as Record<string, unknown>
  const inv  = (data['en_invoice'] ?? data) as Record<string, unknown>

  const seller = (inv['seller']  ?? {}) as Record<string, unknown>
  const buyer  = (inv['buyer']   ?? {}) as Record<string, unknown>
  const totals = (inv['totals']  ?? {}) as Record<string, unknown>
  const tvaAmt = totals['total_vat_amount'] as Record<string, unknown> | string | undefined
  const tvaVal = typeof tvaAmt === 'object' && tvaAmt !== null
    ? parseFloat(String(tvaAmt['value'] ?? '0'))
    : parseFloat(String(tvaAmt ?? '0'))

  const ids = (seller['identifiers'] as Array<Record<string, unknown>> | undefined) ?? []

  const lignes: LigneFactureParsee[] = ((inv['lines'] ?? []) as Array<Record<string, unknown>>).map(l => {
    const vatInfo = (l['vat_information'] ?? {}) as Record<string, unknown>
    const priceD  = (l['price_details']   ?? {}) as Record<string, unknown>
    return {
      id:      String(l['identifier'] ?? ''),
      nom:     String(l['name'] ?? l['label'] ?? l['item_name'] ?? ''),
      qte:     parseFloat(String(l['invoiced_quantity'] ?? '0')) || 0,
      unite:   unite(String(l['invoiced_quantity_code'] ?? '')),
      prixUHT: parseFloat(String(priceD['item_net_price'] ?? '0')) || 0,
      tauxTVA: parseFloat(String(vatInfo['vat_category_rate'] ?? '0')) || 0,
      totalHT: parseFloat(String(l['net_amount'] ?? '0')) || 0,
    }
  })

  const tvaDetails: TvaDetail[] = ((inv['vat_break_down'] ?? []) as Array<Record<string, unknown>>).map(v => ({
    taux:    parseFloat(String(v['vat_category_rate'] ?? '0')) || 0,
    baseHT:  parseFloat(String(v['vat_category_taxable_amount'] ?? '0')) || 0,
    montant: parseFloat(String(v['vat_category_tax_amount'] ?? '0')) || 0,
  }))

  const notes = ((inv['notes'] ?? []) as Array<Record<string, unknown>>)
    .map(nd => String(nd['note'] ?? '')).filter(Boolean)

  return {
    format:       'json',
    numero:       String(inv['number'] ?? inv['invoice_number'] ?? ''),
    dateEmission: String(inv['issue_date'] ?? ''),
    dateEcheance: String(inv['payment_due_date'] ?? inv['due_date'] ?? ''),
    emetteur: {
      nom:    String(seller['name'] ?? ''),
      ref:    String(ids[0]?.['value'] ?? ''),
      tvaId:  String(seller['vat_identifier'] ?? ''),
    },
    destinataire: {
      nom:    String((buyer as Record<string, unknown>)['name'] ?? ''),
      ref:    String(((buyer['identifiers'] as Array<Record<string, unknown>>)?.[0]?.['value']) ?? ''),
    },
    lignes,
    tvaDetails,
    montantHT:  parseFloat(String(totals['total_without_vat'] ?? '0')) || 0,
    montantTVA: tvaVal,
    montantTTC: parseFloat(String(totals['total_with_vat'] ?? totals['amount_due_for_payment'] ?? '0')) || 0,
    notes,
  }
}

// ── Point d'entrée public ─────────────────────────────────────────────────────

export function parseFacture(contenu: string | null | undefined): FactureParsee {
  const vide: FactureParsee = {
    format: 'inconnu', numero: '', emetteur: { nom: '' }, destinataire: { nom: '' },
    lignes: [], tvaDetails: [], montantHT: 0, montantTVA: 0, montantTTC: 0, notes: [],
  }
  if (!contenu) return vide

  try {
    if (contenu.trimStart().startsWith('{'))                    return parseJson(contenu)
    if (contenu.includes('CrossIndustryInvoice'))               return parseCii(contenu)
    if (contenu.includes('<Invoice') || contenu.includes('ubl:Invoice')) return parseUbl(contenu)
  } catch (e) {
    console.error('[parseFacture] erreur parsing:', (e as Error).message)
  }

  return vide
}
