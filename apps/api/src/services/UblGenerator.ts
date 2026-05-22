/**
 * Générateur UBL 2.1 EN 16931 — conforme schematrons FR-CTC v1.3
 * Validé contre POST /v1.beta/validation_reports SuperPDP
 */

interface LigneFacture {
  description:    string
  quantite:       number
  prixUnitaireHT: number
  tauxTVA:        number
}

interface Emetteur {
  nom:             string
  siret:           string
  adresse:         string
  cp:              string
  ville:           string
  tvaNum:          string
  franchiseTva?:   boolean
  assujettUnique?: boolean
  pdpCompanyId?:   string  // ID réel de la société chez le PDP (sandbox: 000000002, prod: SIREN)
}

interface FactureData {
  numero:               string
  dateEmission:         Date
  dateEcheance?:        Date | null
  destinataireSiret?:   string | null
  destinataireNom?:     string | null
  destinataireAdresse?: string | null
  lignes:               LigneFacture[]
}

function fDate(d: Date): string { return d.toISOString().slice(0, 10) }

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Identifiant Peppol pour EndpointID (schemeID 0225)
// SIREN_routage conservé intact ; SIRET pur → 9 premiers chiffres
function toPeppolId(siret: string): string {
  const c = siret.trim()
  if (c.includes('_')) return c
  return c.replace(/\D/g, '').substring(0, 9)
}

// SIREN pur 9 chiffres pour CompanyID schemeID='0002' (norme FR)
function toSiren9(siret: string): string {
  return siret.replace(/\D/g, '').substring(0, 9)
}

export function generateUbl(data: FactureData, emetteur: Emetteur): string {
  const franchise = emetteur.franchiseTva === true

  // ── Totaux et groupement TVA ──────────────────────────────────────────────
  type TvaGroup = { base: number; tva: number; catId: string }
  const tvaGroups = new Map<number, TvaGroup>()
  let montantHT = 0, montantTVA = 0

  const lignesXml = data.lignes.map((l, i) => {
    const taux  = franchise ? 0 : l.tauxTVA
    const ht    = Math.round(l.prixUnitaireHT * l.quantite * 100) / 100
    const tva   = Math.round(ht * taux / 100 * 100) / 100
    const catId = franchise ? 'E' : (taux === 0 ? 'Z' : 'S')
    montantHT  += ht
    montantTVA += tva

    const g = tvaGroups.get(taux)
    if (g) { g.base += ht; g.tva += tva }
    else tvaGroups.set(taux, { base: ht, tva, catId })

    const exemptXml = franchise
      ? '<cbc:TaxExemptionReasonCode>VATEX-EU-132</cbc:TaxExemptionReasonCode>' : ''

    return `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${l.quantite}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${ht.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${esc(l.description)}</cbc:Description>
      <cbc:Name>${esc(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${catId}</cbc:ID>
        <cbc:Percent>${taux}</cbc:Percent>
        ${exemptXml}
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${l.prixUnitaireHT.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
  }).join('')

  montantHT  = Math.round(montantHT  * 100) / 100
  montantTVA = Math.round(montantTVA * 100) / 100
  const montantTTC = Math.round((montantHT + montantTVA) * 100) / 100

  // ── TaxSubtotal (un bloc par taux, obligatoire EN 16931) ─────────────────
  const taxSubtotalsXml = Array.from(tvaGroups.entries()).map(([taux, g]) => {
    const base   = Math.round(g.base * 100) / 100
    const tvaAmt = Math.round(g.tva  * 100) / 100
    const exempt = franchise ? '<cbc:TaxExemptionReasonCode>VATEX-EU-132</cbc:TaxExemptionReasonCode>' : ''
    return `
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="EUR">${base.toFixed(2)}</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="EUR">${tvaAmt.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:ID>${g.catId}</cbc:ID>
      <cbc:Percent>${taux}</cbc:Percent>
      ${exempt}
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>`
  }).join('')

  // ── Notes obligatoires (BR-FR-05) ────────────────────────────────────────
  const notePmt = `<cbc:Note>#PMT#À défaut de paiement à la date d'échéance, une indemnité forfaitaire pour frais de recouvrement de 40 € sera applicable de plein droit.</cbc:Note>`
  const notePmd = `<cbc:Note>#PMD#En cas de retard de paiement, le taux des pénalités est égal au taux d'intérêt appliqué par la BCE majoré de 10 points.</cbc:Note>`
  const noteAab = `<cbc:Note>#AAB#Pas d'escompte pour paiement anticipé.</cbc:Note>`
  const noteAssujetti = emetteur.assujettUnique ? `<cbc:Note subjectCode="TXD">MEMBRE_ASSUJETTI_UNIQUE</cbc:Note>` : ''
  const noteFranchise = franchise ? `<cbc:Note>TVA non applicable - article 293 B du CGI</cbc:Note>` : ''

  const destSiret = data.destinataireSiret ?? ''
  const destSiren = toPeppolId(destSiret)
  const destNom   = data.destinataireNom ?? ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>M1</cbc:ProfileID>
  <cbc:ID>${esc(data.numero)}</cbc:ID>
  <cbc:IssueDate>${fDate(data.dateEmission)}</cbc:IssueDate>
  ${data.dateEcheance ? `<cbc:DueDate>${fDate(data.dateEcheance)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  ${notePmt}
  ${notePmd}
  ${noteAab}
  ${noteAssujetti}
  ${noteFranchise}
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0225">${esc(toPeppolId(emetteur.siret))}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${esc(emetteur.nom)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(emetteur.adresse)}</cbc:StreetName>
        <cbc:CityName>${esc(emetteur.ville)}</cbc:CityName>
        <cbc:PostalZone>${esc(emetteur.cp)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${!franchise ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(emetteur.tvaNum)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(emetteur.nom)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0002">${esc(emetteur.pdpCompanyId || toSiren9(emetteur.siret))}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${destSiren ? `<cbc:EndpointID schemeID="0225">${esc(destSiren)}</cbc:EndpointID>` : ''}
      ${destNom ? `<cac:PartyName><cbc:Name>${esc(destNom)}</cbc:Name></cac:PartyName>` : ''}
      <cac:PostalAddress>
        ${data.destinataireAdresse ? `<cbc:StreetName>${esc(data.destinataireAdresse)}</cbc:StreetName>` : ''}
        <cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(destNom)}</cbc:RegistrationName>
        ${destSiret ? `<cbc:CompanyID schemeID="0002">${esc(toSiren9(destSiret))}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${montantTVA.toFixed(2)}</cbc:TaxAmount>
  ${taxSubtotalsXml}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${montantHT.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${montantHT.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${montantTTC.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${montantTTC.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lignesXml}
</Invoice>`
}
