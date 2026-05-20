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

function parseContenu(raw: string | null): PdpInvoice | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    return ((data['en_invoice'] ?? data) as PdpInvoice)
  } catch { return null }
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
                <p className={styles.partySub}>ID {seller.identifiers[0].value}</p>
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
                    const desc = l.name ?? l.description ?? l.item?.name ?? l.item?.description ?? `Ligne ${l.identifier ?? i + 1}`
                    const qty  = l.invoiced_quantity ? parseFloat(l.invoiced_quantity) : null
                    const unit = l.invoiced_quantity_code ?? ''
                    const pu   = l.price_details?.item_net_price
                    const tva  = l.vat_information?.vat_category_rate
                    return (
                      <tr key={i}>
                        <td className={styles.lineDesc}>{desc}</td>
                        <td className={styles.lineNum}>{qty !== null ? `${qty} ${unit}`.trim() : '—'}</td>
                        <td className={styles.lineNum}>{pu ? fEur(pu) : '—'}</td>
                        <td className={styles.lineNum}>{tva ? `${tva} %` : '—'}</td>
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
