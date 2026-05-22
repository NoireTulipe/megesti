import { parseFacture } from '@megesti/shared'
import type { FactureEmission, StatutEmission } from './hooks/useFacturation'
import styles from './FactureEmissionModal.module.css'

function fEur(v: string | number) {
  return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
function fDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

const STATUT: Record<StatutEmission, { label: string; color: string; bg: string }> = {
  BROUILLON: { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6' },
  ENVOYEE:   { label: 'Envoyée',    color: '#2563EB', bg: '#EFF6FF' },
  ACCEPTEE:  { label: 'Acceptée',   color: '#15803D', bg: '#F0FDF4' },
  REFUSEE:   { label: 'Refusée',    color: '#B91C1C', bg: '#FEF2F2' },
  ANNULEE:   { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6' },
}

interface Props {
  facture: FactureEmission
  onClose: () => void
}

export function FactureEmissionModal({ facture, onClose }: Props) {
  const inv  = parseFacture(facture.contenuXml)
  const meta = STATUT[facture.statut]

  // Lignes depuis le XML parsé (plus riche) ou fallback vide
  const lignes = inv.lignes

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── En-tête ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.invoiceNum}>{facture.numero}</p>
            <p className={styles.invoiceDates}>
              Émise le {fDate(facture.dateEmission)}
              {facture.dateEcheance && ` · Échéance ${fDate(facture.dateEcheance)}`}
            </p>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.statutBadge} style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.body}>

          {/* ── Parties ── */}
          <div className={styles.parties}>
            <div className={styles.party}>
              <p className={styles.partyRole}>Émetteur</p>
              <p className={styles.partyName}>{inv.emetteur.nom || 'Votre entreprise'}</p>
              {inv.emetteur.tvaId && <p className={styles.partySub}>TVA {inv.emetteur.tvaId}</p>}
            </div>
            <div className={styles.partyArrow}>→</div>
            <div className={styles.party}>
              <p className={styles.partyRole}>Destinataire</p>
              <p className={styles.partyName}>{facture.destinataireNom ?? inv.destinataire.nom ?? '—'}</p>
              {facture.destinataireSiret && <p className={styles.partySub}>SIRET {facture.destinataireSiret}</p>}
              {facture.destinataireAdresse && <p className={styles.partySub}>{facture.destinataireAdresse}</p>}
            </div>
          </div>

          {/* ── Lignes ── */}
          {lignes.length > 0 && (
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
                  {lignes.map((l, i) => (
                    <tr key={i}>
                      <td className={styles.lineDesc}>{l.nom || `Ligne ${l.id || i + 1}`}</td>
                      <td className={styles.lineNum}>{l.qte > 0 ? `${l.qte}${l.unite ? ' ' + l.unite : ''}` : '—'}</td>
                      <td className={styles.lineNum}>{l.prixUHT > 0 ? fEur(l.prixUHT) : '—'}</td>
                      <td className={styles.lineNum}>{l.tauxTVA >= 0 ? `${l.tauxTVA} %` : '—'}</td>
                      <td className={styles.lineNum}>{fEur(l.totalHT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Détail TVA ── */}
          {inv.tvaDetails.length > 1 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Détail TVA</p>
              <table className={styles.vatTable}>
                <thead><tr><th>Taux</th><th>Base HT</th><th>Montant TVA</th></tr></thead>
                <tbody>
                  {inv.tvaDetails.map((v, i) => (
                    <tr key={i}>
                      <td>{v.taux} %</td>
                      <td>{fEur(v.baseHT)}</td>
                      <td>{fEur(v.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totaux ── */}
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Total HT</span>
              <span>{fEur(facture.montantHT)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>TVA</span>
              <span>{fEur(facture.montantTVA)}</span>
            </div>
            <div className={styles.totalRowBig}>
              <span>Total TTC</span>
              <span>{fEur(facture.montantTTC)}</span>
            </div>
          </div>

          {/* ── Référence PDP ── */}
          {facture.pdpId && (
            <div className={styles.pdpRef}>
              <span className={styles.pdpLabel}>Référence PDP</span>
              <span className={styles.pdpValue}>{facture.pdpId}</span>
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
