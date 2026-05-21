import type { FactureReception } from './hooks/useFacturation'
import styles from './FactureReceptionModal.module.css'

// ── Parsing du JSON SuperPDP ───────────────────────────────────────────────────

interface PdpSeller {
  name?:        string
  identifiers?: Array<{ value: string; scheme: string }>
  vat_identifier?: string
  postal_address?: { street?: string; city?: string; post_code?: string; country_code?: string }
}

interface PdpLine {
  identifier?:           string
  name?:                 string
  description?:          string
  invoiced_quantity?:    string
  invoiced_quantity_code?: string
  net_amount?:           string
  price_details?: {
    item_net_price?: string
  }
  item?: { name?: string; description?: string }
  vat_information?: { vat_category_rate?: string }
}

interface PdpTotals {
  sum_invoice_lines_amount?: string
  total_without_vat?:        string
  total_vat_amount?:         { value?: string; currency_code?: string } | string
  total_with_vat?:           string
  amount_due_for_payment?:   string
}

interface PdpVatRow {
  vat_category_taxable_amount?: string
  vat_category_tax_amount?:     string
  vat_category_rate?:           string
}

interface PdpInvoice {
  number?:           string
  issue_date?:       string
  payment_due_date?: string
  currency_code?:    string
  seller?:           PdpSeller
  buyer?:            PdpSeller
  totals?:           PdpTotals
  vat_break_down?:   PdpVatRow[]
  lines?:            PdpLine[]
  notes?:            Array<{ subject_code?: string; note?: string }>
}

// Extrait le texte d'un tag XML (sans namespace) — cherche le tag EXACT
function tag(xml: string, name: string): string {
  // Cherche <Name>, <cbc:Name>, <ram:Name>, etc. mais pas <RegistrationName>
  const re = new RegExp(`<(?:[a-zA-Z]+:)?${name}(?:\\s[^>]*)?>([^<]*)`, 'i')
  return xml.match(re)?.[1]?.trim() ?? ''
}

// Codes unités UN/CEFACT → libellé lisible
const UNIT_LABELS: Record<string, string> = {
  C62: 'unité', KGM: 'kg', GRM: 'g', LTR: 'L', MTR: 'm',
  MTK: 'm²', MTQ: 'm³', HUR: 'h', DAY: 'j', MON: 'mois',
  ANN: 'an', SET: 'lot', NMP: 'paquet', PCE: 'pièce',
}
function unitLabel(code: string | undefined): string {
  return code ? (UNIT_LABELS[code.toUpperCase()] ?? code) : ''
}

function parseContenu(raw: string | null): PdpInvoice | null {
  if (!raw) return null

  // ── JSON SuperPDP (en_invoice) ─────────────────────────────────────────────
  if (raw.trimStart().startsWith('{')) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      const inv  = (data['en_invoice'] ?? data) as Record<string, unknown>
      // Normalise les lignes : SuperPDP peut nommer le champ différemment
      const rawLines = (inv['lines'] ?? []) as Array<Record<string, unknown>>
      const lines: PdpLine[] = rawLines.map(l => {
        const vatInfo = (l['vat_information'] ?? l['vat'] ?? {}) as Record<string, unknown>
        const priceD  = (l['price_details']   ?? l['price'] ?? {}) as Record<string, unknown>
        return {
          identifier:            String(l['identifier'] ?? ''),
          name:                  String(l['name'] ?? l['label'] ?? l['libelle'] ?? l['item_name'] ?? ''),
          description:           String(l['description'] ?? ''),
          invoiced_quantity:     String(l['invoiced_quantity'] ?? l['quantity'] ?? ''),
          invoiced_quantity_code: String(l['invoiced_quantity_code'] ?? l['unit_code'] ?? l['unit'] ?? ''),
          net_amount:            String(l['net_amount'] ?? l['line_total'] ?? ''),
          price_details:         { item_net_price: String(priceD['item_net_price'] ?? priceD['price'] ?? '') },
          vat_information:       { vat_category_rate: String(vatInfo['vat_category_rate'] ?? vatInfo['rate'] ?? vatInfo['percent'] ?? '') },
        }
      })
      return {
        number:           String(inv['number'] ?? inv['id'] ?? inv['invoice_number'] ?? ''),
        issue_date:       String(inv['issue_date'] ?? ''),
        payment_due_date: String(inv['payment_due_date'] ?? inv['due_date'] ?? ''),
        currency_code:    String(inv['currency_code'] ?? 'EUR'),
        seller:           (inv['seller']  as PdpSeller | undefined),
        buyer:            (inv['buyer']   as PdpSeller | undefined),
        totals:           (inv['totals']  as PdpTotals | undefined),
        vat_break_down:   (inv['vat_break_down'] as PdpVatRow[] | undefined),
        lines,
        notes:            (inv['notes'] as Array<{subject_code?: string; note?: string}> | undefined),
      }
    } catch { /* pas du JSON valide, continue vers XML */ }
  }

  // ── UBL 2.1 ───────────────────────────────────────────────────────────────
  if (raw.includes('<Invoice') || raw.includes('ubl:Invoice')) {
    // Numéro = <ID> racine (avant tout AccountingSupplierParty)
    const preParty   = raw.split(/<[^>]*AccountingSupplierParty/)[0] ?? raw
    const invoiceNum = preParty.match(/<(?:[a-zA-Z]+:)?ID(?:\s[^>]*)?>([^<]+)/)?.[1]?.trim() ?? ''

    const sellerB = raw.match(/<[^>]*AccountingSupplierParty[^>]*>([\s\S]*?)<\/[^>]*AccountingSupplierParty>/)?.[1] ?? ''
    const buyerB  = raw.match(/<[^>]*AccountingCustomerParty[^>]*>([\s\S]*?)<\/[^>]*AccountingCustomerParty>/)?.[1] ?? ''
    const sellerName = tag(sellerB, 'RegistrationName') || tag(sellerB, 'Name')
    const buyerName  = tag(buyerB,  'RegistrationName') || tag(buyerB,  'Name')

    const lines: PdpLine[] = []
    const lineRe = /<[^>]*InvoiceLine[^>]*>([\s\S]*?)<\/[^>]*InvoiceLine>/g
    let lm: RegExpExecArray | null
    while ((lm = lineRe.exec(raw)) !== null) {
      const lb  = lm[1]
      // Nom dans <Item><Name> ou <Item><Description>
      const itemB = lb.match(/<[^>]*Item[^>]*>([\s\S]*?)<\/[^>]*Item>/)?.[1] ?? ''
      lines.push({
        identifier:             tag(lb, 'ID'),
        name:                   tag(itemB, 'Name') || tag(itemB, 'Description'),
        invoiced_quantity:      lb.match(/<[^>]*InvoicedQuantity[^>]*>([^<]+)/)?.[1]?.trim() ?? '',
        invoiced_quantity_code: lb.match(/unitCode="([^"]+)"/)?.[1],
        net_amount:             tag(lb, 'LineExtensionAmount'),
        price_details:          { item_net_price: tag(lb, 'PriceAmount') },
        vat_information:        { vat_category_rate: tag(itemB, 'Percent') || tag(lb, 'Percent') },
      })
    }

    const vatRows: PdpVatRow[] = []
    const subRe = /<[^>]*TaxSubtotal[^>]*>([\s\S]*?)<\/[^>]*TaxSubtotal>/g
    let sm: RegExpExecArray | null
    while ((sm = subRe.exec(raw)) !== null) {
      const sb = sm[1]
      vatRows.push({ vat_category_taxable_amount: tag(sb,'TaxableAmount'), vat_category_tax_amount: tag(sb,'TaxAmount'), vat_category_rate: tag(sb,'Percent') })
    }

    return {
      number: invoiceNum, issue_date: tag(raw,'IssueDate'), payment_due_date: tag(raw,'DueDate'),
      currency_code: tag(raw,'DocumentCurrencyCode'),
      seller: { name: sellerName }, buyer: { name: buyerName },
      totals: { total_without_vat: tag(raw,'TaxExclusiveAmount'), total_vat_amount: tag(raw,'TaxAmount'), total_with_vat: tag(raw,'TaxInclusiveAmount'), amount_due_for_payment: tag(raw,'PayableAmount') },
      vat_break_down: vatRows, lines,
    }
  }

  // ── CII (CrossIndustryInvoice) ─────────────────────────────────────────────
  if (raw.includes('CrossIndustryInvoice')) {
    const docB    = raw.match(/<[^>]*ExchangedDocument[^>]*>([\s\S]*?)<\/[^>]*ExchangedDocument>/)?.[1] ?? ''
    const sellerB = raw.match(/<[^>]*SellerTradeParty[^>]*>([\s\S]*?)<\/[^>]*SellerTradeParty>/)?.[1] ?? ''
    const buyerB  = raw.match(/<[^>]*BuyerTradeParty[^>]*>([\s\S]*?)<\/[^>]*BuyerTradeParty>/)?.[1]  ?? ''
    const summB   = raw.match(/<[^>]*SpecifiedTradeSettlementHeaderMonetarySummation[^>]*>([\s\S]*?)<\/[^>]*SpecifiedTradeSettlementHeaderMonetarySummation>/)?.[1] ?? ''

    // Date format 102 : YYYYMMDD → YYYY-MM-DD
    const parseCiiDate = (block: string): string => {
      const d = block.match(/format="102">(\d{8})</)?.[1]
      return d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : ''
    }

    const lines: PdpLine[] = []
    const lineRe = /<[^>]*IncludedSupplyChainTradeLineItem[^>]*>([\s\S]*?)<\/[^>]*IncludedSupplyChainTradeLineItem>/g
    let lm: RegExpExecArray | null
    while ((lm = lineRe.exec(raw)) !== null) {
      const lb   = lm[1]
      const prodB = lb.match(/<[^>]*SpecifiedTradeProduct[^>]*>([\s\S]*?)<\/[^>]*SpecifiedTradeProduct>/)?.[1] ?? ''
      lines.push({
        identifier:             tag(lb, 'LineID'),
        name:                   tag(prodB, 'Name') || tag(prodB, 'Description'),
        invoiced_quantity:      lb.match(/<[^>]*BilledQuantity[^>]*>([^<]+)/)?.[1]?.trim() ?? '',
        invoiced_quantity_code: lb.match(/unitCode="([^"]+)"/)?.[1],
        net_amount:             tag(lb, 'LineTotalAmount'),
        price_details:          { item_net_price: tag(lb, 'ChargeAmount') },
        vat_information:        { vat_category_rate: tag(lb, 'RateApplicablePercent') },
      })
    }

    const vatRows: PdpVatRow[] = []
    const taxRe = /<[^>]*ApplicableTradeTax[^>]*>([\s\S]*?)<\/[^>]*ApplicableTradeTax>/g
    let tm: RegExpExecArray | null
    while ((tm = taxRe.exec(raw)) !== null) {
      const tb = tm[1]
      if (!tag(tb, 'BasisAmount')) continue // skip line-level entries without BasisAmount
      vatRows.push({ vat_category_taxable_amount: tag(tb,'BasisAmount'), vat_category_tax_amount: tag(tb,'CalculatedAmount'), vat_category_rate: tag(tb,'RateApplicablePercent') })
    }

    const dueDateB = raw.match(/<[^>]*DueDateDateTime[^>]*>([\s\S]*?)<\/[^>]*DueDateDateTime>/)?.[1] ?? ''

    return {
      number: tag(docB, 'ID'), issue_date: parseCiiDate(docB), payment_due_date: parseCiiDate(dueDateB),
      currency_code: tag(raw,'InvoiceCurrencyCode'),
      seller: { name: tag(sellerB,'Name') }, buyer: { name: tag(buyerB,'Name') },
      totals: { total_without_vat: tag(summB,'TaxBasisTotalAmount'), total_vat_amount: tag(summB,'TaxTotalAmount'), total_with_vat: tag(summB,'GrandTotalAmount'), amount_due_for_payment: tag(summB,'DuePayableAmount') },
      vat_break_down: vatRows, lines,
    }
  }

  return null
}

function fEur(v: string | number | undefined) {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  return Number.isNaN(n) ? '—' : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function fDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getTvaTotal(t: PdpTotals['total_vat_amount']): string | undefined {
  if (!t) return undefined
  if (typeof t === 'string') return t
  return t.value
}

// ── Composant ──────────────────────────────────────────────────────────────────

interface Props {
  facture: FactureReception
  onClose: () => void
}

export function FactureReceptionModal({ facture, onClose }: Props) {
  const inv = parseContenu(facture.contenuXml)

  const seller = inv?.seller
  const buyer  = inv?.buyer
  const totals = inv?.totals

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── En-tête ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.invoiceNum}>
              {inv?.number ?? facture.pdpId}
            </p>
            <p className={styles.invoiceDates}>
              Émise le {fDate(inv?.issue_date)}
              {inv?.payment_due_date && ` · Échéance ${fDate(inv.payment_due_date)}`}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>

          {/* ── Parties ── */}
          <div className={styles.parties}>
            <div className={styles.party}>
              <p className={styles.partyRole}>Émetteur</p>
              <p className={styles.partyName}>{seller?.name ?? facture.emetteurNom ?? '—'}</p>
              {seller?.identifiers?.[0] && (
                <p className={styles.partySub}>Réf. {seller.identifiers[0].value}</p>
              )}
              {seller?.vat_identifier && (
                <p className={styles.partySub}>TVA {seller.vat_identifier}</p>
              )}
            </div>
            <div className={styles.partyArrow}>→</div>
            <div className={styles.party}>
              <p className={styles.partyRole}>Destinataire</p>
              <p className={styles.partyName}>{buyer?.name ?? '—'}</p>
              {buyer?.identifiers?.[0] && (
                <p className={styles.partySub}>ID {buyer.identifiers[0].value}</p>
              )}
            </div>
          </div>

          {/* ── Lignes ── */}
          {inv?.lines && inv.lines.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Lignes</p>
              <table className={styles.linesTable}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qté</th>
                    <th>Prix HT / u.</th>
                    <th>TVA</th>
                    <th>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lines.map((l, i) => {
                    const desc = (l.name || l.description || l.item?.name || l.item?.description || '') || `Ligne ${l.identifier ?? i + 1}`
                    const qty  = l.invoiced_quantity ? parseFloat(l.invoiced_quantity) : null
                    const unit = unitLabel(l.invoiced_quantity_code)
                    const pu   = l.price_details?.item_net_price
                    const tva  = l.vat_information?.vat_category_rate
                    return (
                      <tr key={i}>
                        <td className={styles.lineDesc}>{desc}</td>
                        <td className={styles.lineNum}>{qty !== null ? `${qty}${unit ? ' ' + unit : ''}` : '—'}</td>
                        <td className={styles.lineNum}>{pu ? fEur(pu) : '—'}</td>
                        <td className={styles.lineNum}>{tva ? `${parseFloat(tva)} %` : '—'}</td>
                        <td className={styles.lineNum}>{l.net_amount ? fEur(l.net_amount) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TVA ── */}
          {inv?.vat_break_down && inv.vat_break_down.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Détail TVA</p>
              <table className={styles.vatTable}>
                <thead><tr><th>Taux</th><th>Base HT</th><th>Montant TVA</th></tr></thead>
                <tbody>
                  {inv.vat_break_down.map((v, i) => (
                    <tr key={i}>
                      <td>{v.vat_category_rate ? `${v.vat_category_rate} %` : '—'}</td>
                      <td>{fEur(v.vat_category_taxable_amount)}</td>
                      <td>{fEur(v.vat_category_tax_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totaux ── */}
          <div className={styles.totals}>
            {totals?.total_without_vat && (
              <div className={styles.totalRow}>
                <span>Total HT</span>
                <span>{fEur(totals.total_without_vat)}</span>
              </div>
            )}
            {totals?.total_vat_amount && (
              <div className={styles.totalRow}>
                <span>TVA</span>
                <span>{fEur(getTvaTotal(totals.total_vat_amount))}</span>
              </div>
            )}
            <div className={styles.totalRowBig}>
              <span>Total TTC</span>
              <span>{fEur(totals?.total_with_vat ?? totals?.amount_due_for_payment ?? facture.montantTTC)}</span>
            </div>
          </div>

          {/* ── Notes ── */}
          {inv?.notes && inv.notes.length > 0 && (
            <div className={styles.notes}>
              {inv.notes.map((n, i) => (
                <p key={i} className={styles.note}>{n.note}</p>
              ))}
            </div>
          )}

        </div>

        <div className={styles.footer}>
          <button className={styles.btnClose} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
