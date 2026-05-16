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
  nom:     string
  siret:   string
  adresse: string
  cp:      string
  ville:   string
  tvaNum:  string
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

export function generateUbl(data: FactureData, emetteur: Emetteur): string {
  let montantHT = 0, montantTVA = 0

  const lignesXml = data.lignes.map((l, i) => {
    const ht  = Math.round(l.prixUnitaireHT * l.quantite * 100) / 100
    const tva = Math.round(ht * l.tauxTVA / 100 * 100) / 100
    montantHT  += ht
    montantTVA += tva

    return `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${l.quantite}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${ht.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${esc(l.description)}</cbc:Description>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${l.tauxTVA}</cbc:Percent>
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

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0009">${esc(emetteur.siret)}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${esc(emetteur.nom)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(emetteur.adresse)}</cbc:StreetName>
        <cbc:PostalZone>${esc(emetteur.cp)}</cbc:PostalZone>
        <cbc:CityName>${esc(emetteur.ville)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(emetteur.tvaNum)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(emetteur.nom)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0009">${esc(emetteur.siret)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${data.destinataireSiret ? `<cbc:EndpointID schemeID="0009">${esc(data.destinataireSiret)}</cbc:EndpointID>` : ''}
      ${data.destinataireNom   ? `<cac:PartyName><cbc:Name>${esc(data.destinataireNom)}</cbc:Name></cac:PartyName>` : ''}
      ${data.destinataireSiret ? `<cac:PartyLegalEntity><cbc:CompanyID schemeID="0009">${esc(data.destinataireSiret)}</cbc:CompanyID></cac:PartyLegalEntity>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${montantTVA.toFixed(2)}</cbc:TaxAmount>
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
