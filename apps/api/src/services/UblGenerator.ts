/**
 * Générateur de factures UBL 2.1 (EN 16931) pour superpdp.tech.
 * Format minimal conforme à la réforme française facturation électronique 2026.
 *
 * À enrichir avec les champs requis une fois la doc superpdp lue en détail
 * (notamment les extensions françaises et les codes unspsc/cpv).
 */

interface LigneFacture {
  description:    string
  quantite:       number
  prixUnitaireHT: number
  tauxTVA:        number
}

interface Emetteur {
  nom:            string
  siret:          string
  adresse:        string
  cp:             string
  ville:          string
  tvaNum:         string
  franchiseTva?:  boolean   // art. 293 B CGI — pas de TVA collectée
  assujettUnique?: boolean  // groupe TVA — note BG-1 obligatoire
}

interface FactureData {
  numero:              string
  dateEmission:        Date
  dateEcheance?:       Date | null
  destinataireSiret?:  string | null
  destinataireNom?:    string | null
  destinataireAdresse?:string | null
  lignes:              LigneFacture[]
}

function fDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Identifiant Peppol depuis un SIRET ou un ID déjà formaté.
// Production : SIRET 14 chiffres → SIREN 9 chiffres (ex: 57221288500015 → 572212885)
// Sandbox / cas spéciaux : SIREN_routage conservé tel quel (ex: 315143296_7376)
function toPeppolId(siret: string): string {
  const clean = siret.trim()
  if (clean.includes('_')) return clean          // déjà au format SIREN_routage
  const digits = clean.replace(/\D/g, '')
  return digits.substring(0, 9)                  // SIREN standard
}

export function generateUbl(data: FactureData, emetteur: Emetteur): string {
  const franchise = emetteur.franchiseTva === true

  // ── Calcul des totaux et regroupement par taux TVA ─────────────────────────
  type TvaGroup = { base: number; tva: number; catId: string }
  const tvaGroups = new Map<number, TvaGroup>()
  let montantHT = 0, montantTVA = 0

  const lignesXml = data.lignes.map((l, i) => {
    const taux   = franchise ? 0 : l.tauxTVA
    const ht     = Math.round(l.prixUnitaireHT * l.quantite * 100) / 100
    const tva    = Math.round(ht * taux / 100 * 100) / 100
    const catId  = franchise ? 'E' : (taux === 0 ? 'Z' : 'S')
    montantHT   += ht
    montantTVA  += tva

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

  // ── TaxSubtotal EN 16931 : un bloc par taux (obligatoire pour Peppol) ──────
  const taxSubtotalsXml = Array.from(tvaGroups.entries()).map(([taux, g]) => {
    const base = Math.round(g.base * 100) / 100
    const tva  = Math.round(g.tva  * 100) / 100
    const exempt = franchise
      ? '<cbc:TaxExemptionReasonCode>VATEX-EU-132</cbc:TaxExemptionReasonCode>' : ''
    return `
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="EUR">${base.toFixed(2)}</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="EUR">${tva.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:ID>${g.catId}</cbc:ID>
      <cbc:Percent>${taux}</cbc:Percent>
      ${exempt}
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>`
  }).join('')

  // Note assujetti unique (BG-1 obligatoire si groupe TVA)
  const noteAssujetti = emetteur.assujettUnique
    ? `<cbc:Note subjectCode="TXD">MEMBRE_ASSUJETTI_UNIQUE</cbc:Note>`
    : ''

  // Note franchise TVA (mention légale obligatoire art. 293 B CGI)
  const noteFranchise = franchise
    ? `<cbc:Note>TVA non applicable - article 293 B du CGI</cbc:Note>`
    : ''

  const destSiret  = data.destinataireSiret ?? ''
  const destSiren  = toPeppolId(destSiret)

  return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(data.numero)}</cbc:ID>
  <cbc:IssueDate>${fDate(data.dateEmission)}</cbc:IssueDate>
  ${data.dateEcheance ? `<cbc:DueDate>${fDate(data.dateEcheance)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  ${noteAssujetti}
  ${noteFranchise}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0225">${esc(toPeppolId(emetteur.siret))}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${esc(emetteur.nom)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(emetteur.adresse)}</cbc:StreetName>
        <cbc:PostalZone>${esc(emetteur.cp)}</cbc:PostalZone>
        <cbc:CityName>${esc(emetteur.ville)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${!franchise ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(emetteur.tvaNum)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(emetteur.nom)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0009">${esc(emetteur.siret)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${destSiren ? `<cbc:EndpointID schemeID="0225">${esc(destSiren)}</cbc:EndpointID>` : ''}
      ${data.destinataireNom ? `<cac:PartyName><cbc:Name>${esc(data.destinataireNom)}</cbc:Name></cac:PartyName>` : ''}
      ${destSiret ? `<cac:PartyLegalEntity><cbc:CompanyID schemeID="0009">${esc(destSiret)}</cbc:CompanyID></cac:PartyLegalEntity>` : ''}
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
</ubl:Invoice>`
}
