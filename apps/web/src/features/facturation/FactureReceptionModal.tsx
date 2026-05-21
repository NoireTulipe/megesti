import { parseFacture, type FactureParsee } from '@megesti/shared'
import type { FactureReception } from './hooks/useFacturation'
import styles from './FactureReceptionModal.module.css'

function fEur(v: number) {
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function fDate(iso: string | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

interface Props {
  facture: FactureReception
  onClose: () => void
}

export function FactureReceptionModal({ facture, onClose }: Props) {
  const inv: FactureParsee = parseFacture(facture.contenuXml)

  const numero = (inv.numero && inv.numero.length > 2)
    ? inv.numero
    : `Réf. ${facture.pdpId}`

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── En-tête ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.invoiceNum}>{numero}</p>
            <p className={styles.invoiceDates}>
              Émise le {fDate(inv.dateEmission)}
              {inv.dateEcheance && ` · Échéance ${fDate(inv.dateEcheance)}`}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>

          {/* ── Parties ── */}
          <div className={styles.parties}>
            <div className={styles.party}>
              <p className={styles.partyRole}>Émetteur</p>
              <p className={styles.partyName}>{inv.emetteur.nom || facture.emetteurNom || '—'}</p>
              {inv.emetteur.ref   && <p className={styles.partySub}>Réf. {inv.emetteur.ref}</p>}
              {inv.emetteur.tvaId && <p className={styles.partySub}>TVA {inv.emetteur.tvaId}</p>}
            </div>
            <div className={styles.partyArrow}>→</div>
            <div className={styles.party}>
              <p className={styles.partyRole}>Destinataire</p>
              <p className={styles.partyName}>{inv.destinataire.nom || '—'}</p>
              {inv.destinataire.ref   && <p className={styles.partySub}>Réf. {inv.destinataire.ref}</p>}
              {inv.destinataire.tvaId && <p className={styles.partySub}>TVA {inv.destinataire.tvaId}</p>}
            </div>
          </div>

          {/* ── Lignes ── */}
          {inv.lignes.length > 0 && (
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
                  {inv.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className={styles.lineDesc}>{l.nom || `Ligne ${l.id || i + 1}`}</td>
                      <td className={styles.lineNum}>{l.qte > 0 ? `${l.qte}${l.unite ? ' ' + l.unite : ''}` : '—'}</td>
                      <td className={styles.lineNum}>{l.prixUHT > 0 ? fEur(l.prixUHT) : '—'}</td>
                      <td className={styles.lineNum}>{l.tauxTVA > 0 ? `${l.tauxTVA} %` : '0 %'}</td>
                      <td className={styles.lineNum}>{fEur(l.totalHT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Détail TVA ── */}
          {inv.tvaDetails.length > 0 && (
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
            {inv.montantHT > 0 && (
              <div className={styles.totalRow}>
                <span>Total HT</span><span>{fEur(inv.montantHT)}</span>
              </div>
            )}
            {inv.montantTVA > 0 && (
              <div className={styles.totalRow}>
                <span>TVA</span><span>{fEur(inv.montantTVA)}</span>
              </div>
            )}
            <div className={styles.totalRowBig}>
              <span>Total TTC</span>
              <span>{fEur(inv.montantTTC || Number(facture.montantTTC))}</span>
            </div>
          </div>

          {/* ── Notes ── */}
          {inv.notes.length > 0 && (
            <div className={styles.notes}>
              {inv.notes.map((note, i) => (
                <p key={i} className={styles.note}>{note}</p>
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
