import { useState, useMemo } from 'react'
import { useVentes } from './hooks/useVentes'
import type { Vente } from './hooks/useVentes'
import { useFraisSession } from './hooks/useFrais'
import type { Frais } from './hooks/useFrais'
import { TYPE_FRAIS_EMOJI, TYPE_FRAIS_LABELS } from './hooks/useFrais'
import { useSessionDroits } from './hooks/useSessionDroits'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import type { Article } from '@/features/catalogue/types'
import { HelpButton } from '@/components/HelpButton'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import styles from './BilanSession.module.css'

function fEur(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fHeure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const MODE_META: Record<string, { label: string; color: string }> = {
  CB:       { label: 'Carte',    color: '#3D5470' },
  ESPECES:  { label: 'Espèces', color: '#6B8F71' },
  CHEQUE:   { label: 'Chèque',  color: '#C9933A' },
  VIREMENT: { label: 'Virement',color: '#8B7BAB' },
  SUMUP:    { label: 'SumUp',   color: '#C4907C' },
  PDV:      { label: 'PDV',     color: '#C85D3A' },
}

// ── Accordéon générique ───────────────────────────────────────────────────────

function Accordion({
  header, count, total, color = '#6B8F71', empty, children, defaultOpen = false, unit = 'entrée',
}: {
  header: string; count: number; total: number | null; color?: string
  empty: string; children: React.ReactNode; defaultOpen?: boolean; unit?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.accordion}>
      <button className={styles.accordionHead} onClick={() => setOpen(o => !o)}>
        <span className={styles.accordionTitle}>{header}</span>
        <span className={styles.accordionCount}>{count} {unit}{count > 1 ? 's' : ''}</span>
        {total !== null && (
          <span className={styles.accordionTotal} style={{ color }}>
            {fEur(total)}
          </span>
        )}
        <span className={styles.accordionChevron} style={{ transform: open ? 'rotate(180deg)' : undefined }}>▾</span>
      </button>
      {open && (
        <div className={styles.accordionBody}>
          {count === 0 ? <p className={styles.empty}>{empty}</p> : children}
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sessionId:           string
  ventes?:             Vente[]
  frais?:              Frais[]
  articles?:           Article[]
  sessionNom?:         string
  pdvNom?:             string
  commissionFixe?:     string | null
  commissionPourcent?: string | null
  onClose:             () => void
}

export function BilanSession({ sessionId, ventes: ventesProp, frais: fraisProp, articles: articlesProp, sessionNom, pdvNom, commissionFixe, commissionPourcent, onClose }: Props) {
  const { data: droitsData } = useSessionDroits(sessionId)
  const { can, upgradeMessage } = usePlanFeatures()

  const fetchRemote = ventesProp === undefined
  const { data: ventesRemote   = [] } = useVentes(fetchRemote ? sessionId : undefined)
  const { data: fraisRemote    = [] } = useFraisSession(fetchRemote ? sessionId : null)
  const { data: articlesRemote = [] } = useArticles()

  const ventes   = ventesProp   ?? ventesRemote
  const frais    = fraisProp    ?? fraisRemote
  const articles = articlesProp ?? articlesRemote

  const ventesValidees = ventes.filter(v => v.statut === 'VALIDEE')
  const ventesAnnulees = ventes.filter(v => v.statut === 'ANNULEE')
  const ventesDirectes = ventesValidees.filter(v => v.modePaiement !== 'PDV')
  const ventesPDV      = ventesValidees.filter(v => v.modePaiement === 'PDV')
  const fraisActifs    = frais.filter(f => f.actif !== false)

  const caTTC      = ventesValidees.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
  const caHT       = ventesValidees.reduce((s, v) => s + parseFloat(v.totalHT),  0)
  const caPDV      = ventesPDV.reduce((s, v)      => s + parseFloat(v.totalTTC), 0)
  const caEnCaisse = ventesDirectes.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
  const nbVentes   = ventesValidees.length
  const ticketMoyen = nbVentes > 0 ? caTTC / nbVentes : 0
  const totalFrais  = fraisActifs.reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0)

  const produits = useMemo(() => {
    const map = new Map<string, { nom: string; quantite: number; caTTC: number; caHT: number; articleId: string }>()
    ventesValidees.forEach(v =>
      v.lignes.forEach(l => {
        const prev = map.get(l.articleId) ?? { nom: l.article.nom, quantite: 0, caTTC: 0, caHT: 0, articleId: l.articleId }
        map.set(l.articleId, { ...prev, quantite: prev.quantite + l.quantite, caTTC: prev.caTTC + parseFloat(l.totalLigneTTC), caHT: prev.caHT + parseFloat(l.totalLigneHT) })
      })
    )
    return Array.from(map.values()).sort((a, b) => b.caTTC - a.caTTC)
  }, [ventesValidees])

  const { coutDesVentes, hasCout } = useMemo(() => {
    let total = 0; let count = 0
    produits.forEach(p => {
      const art = articles.find(a => a.id === p.articleId)
      if (!art) return
      const u = art.prixAchatLotHT && art.prixAchatLotQte
        ? parseFloat(art.prixAchatLotHT) / art.prixAchatLotQte
        : art.prixAchatHT ? parseFloat(art.prixAchatHT) : null
      if (u !== null) { total += u * p.quantite; count++ }
    })
    return { coutDesVentes: total, hasCout: count > 0 }
  }, [produits, articles])

  const commissionMontant = useMemo(() => {
    if (caPDV === 0) return 0
    if (commissionFixe)     return parseFloat(commissionFixe)
    if (commissionPourcent) return caPDV * parseFloat(commissionPourcent) / 100
    return 0
  }, [caPDV, commissionFixe, commissionPourcent])
  const hasCommission = commissionMontant > 0

  const totalDroits = droitsData?.totalNet ?? 0
  const benefice    = hasCout ? caHT - coutDesVentes - totalFrais - commissionMontant - totalDroits : null
  const maxProdCA   = produits[0]?.caTTC ?? 1
  const hasDroits   = !!(droitsData && droitsData.auteurs.length > 0)

  return (
    <div className={styles.wrap}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerBlob} />
        <div className={styles.headerTop}>
          <div>
            <h2 className={styles.headerTitle}>Bilan de session</h2>
            {sessionNom && <p className={styles.headerSub}>{sessionNom}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* ── Hero : CA + Bénéfice ── */}
        <div className={styles.heroCards}>
          <div className={styles.heroCard}>
            <span className={styles.heroLabel}>
              Chiffre d'affaires
              <HelpButton variant="ghost" slug="bilan-metric-ca-ttc" size="sm" />
            </span>
            <span className={styles.heroVal}>{fEur(caTTC)}</span>
            <span className={styles.heroSub}>
              HT {fEur(caHT)} · {nbVentes} vente{nbVentes > 1 ? 's' : ''}
            </span>
          </div>

          <div className={`${styles.heroCard} ${styles.heroCardBenef}`}>
            <span className={styles.heroLabel}>
              Bénéfice estimé
              <HelpButton variant="ghost" slug="bilan-metric-benefice" size="sm" />
            </span>
            {benefice !== null ? (
              <>
                <span className={styles.heroVal} style={{ color: benefice >= 0 ? '#4ade80' : '#f87171' }}>
                  {benefice >= 0 ? '+' : ''}{fEur(benefice)}
                </span>
                <span className={styles.heroSub}>après déductions</span>
              </>
            ) : (
              <>
                <span className={styles.heroVal} style={{ color: 'rgba(255,255,255,0.22)' }}>—</span>
                <span className={styles.heroSub}>prix d'achat manquants</span>
              </>
            )}
          </div>
        </div>

        {/* ── Chips secondaires ── */}
        <div className={styles.metricsRow}>
          {caPDV > 0 && (
            <div className={styles.metricChip}>
              <span className={styles.chipLabel}>
                En caisse <HelpButton variant="ghost" slug="bilan-metric-en-caisse" size="sm" />
              </span>
              <span className={styles.chipVal}>{fEur(caEnCaisse)}</span>
              <span className={styles.chipSub} style={{ color: '#fbbf24' }}>+ {fEur(caPDV)} PDV</span>
            </div>
          )}
          {hasCommission && (
            <div className={styles.metricChip}>
              <span className={styles.chipLabel}>
                Commission PDV <HelpButton variant="ghost" slug="bilan-metric-commission-pdv" size="sm" />
              </span>
              <span className={styles.chipVal} style={{ color: '#fca5a5' }}>−{fEur(commissionMontant)}</span>
              <span className={styles.chipSub}>
                {commissionPourcent ? `${parseFloat(commissionPourcent)} %` : 'forfait'}
              </span>
            </div>
          )}
          <div className={styles.metricChip}>
            <span className={styles.chipLabel}>
              Ticket moyen <HelpButton variant="ghost" slug="bilan-metric-ticket-moyen" size="sm" />
            </span>
            <span className={styles.chipVal}>{fEur(ticketMoyen)}</span>
            <span className={styles.chipSub}>{nbVentes} vente{nbVentes > 1 ? 's' : ''}</span>
          </div>
          <div className={styles.metricChip}>
            <span className={styles.chipLabel}>
              Frais <HelpButton variant="ghost" slug="bilan-metric-frais" size="sm" />
            </span>
            <span className={styles.chipVal}>{fEur(totalFrais)}</span>
            <span className={styles.chipSub}>{fraisActifs.length} entrée{fraisActifs.length > 1 ? 's' : ''}</span>
          </div>
          {hasCout && (
            <div className={styles.metricChip}>
              <span className={styles.chipLabel}>
                Coût ventes <HelpButton variant="ghost" slug="bilan-metric-cout-ventes" size="sm" />
              </span>
              <span className={styles.chipVal}>{fEur(coutDesVentes)}</span>
            </div>
          )}
          {hasDroits && (
            <div className={styles.metricChip}>
              <span className={styles.chipLabel}>
                Droits auteurs <HelpButton variant="ghost" slug="bilan-metric-droits" size="sm" />
              </span>
              <span className={styles.chipVal} style={{ color: '#c4b5fd' }}>{fEur(totalDroits)}</span>
              <span className={styles.chipSub}>{droitsData!.auteurs.length} auteur{droitsData!.auteurs.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {ventesAnnulees.length > 0 && (
            <div className={styles.metricChip}>
              <span className={styles.chipLabel}>Annulées</span>
              <span className={styles.chipVal} style={{ color: '#f87171' }}>{ventesAnnulees.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ACCORDÉONS ─────────────────────────────────────────────── */}
      <div className={styles.scrollArea}>

      {/* Ventes */}
      <Accordion
        header="Ventes"
        count={ventesValidees.length}
        total={caTTC}
        color="rgba(255,255,255,0.7)"
        empty="Aucune vente enregistrée."
        defaultOpen
        unit="vente"
      >
        {ventes.map(v => {
          const meta = MODE_META[v.modePaiement]
          const annulee = v.statut === 'ANNULEE'
          return (
            <div key={v.id} className={`${styles.venteRow} ${annulee ? styles.venteAnnulee : ''}`}>
              <div className={styles.venteStripe} style={{ background: annulee ? '#ef4444' : (meta?.color ?? '#888') }} />
              <div className={styles.venteBody}>
                <div className={styles.venteTop}>
                  <span className={styles.venteNum}>#{v.numero}</span>
                  <span className={styles.venteHeure}>{fHeure(v.dateVente)}</span>
                  {!annulee && (
                    <span className={styles.venteModeTag}
                      style={{ background: `${meta?.color ?? '#888'}18`, color: meta?.color ?? '#888' }}>
                      {meta?.label ?? v.modePaiement}
                    </span>
                  )}
                  {annulee && <span className={styles.venteAnnuleeBadge}>Annulée</span>}
                  <span className={styles.venteMontant}>{fEur(parseFloat(v.totalTTC))}</span>
                </div>
                {v.lignes.length > 0 && (
                  <div className={styles.venteItems}>
                    {v.lignes.map(l => (
                      <span key={l.id} className={styles.venteItem}>
                        {l.article.nom}
                        {l.quantite > 1 && <span className={styles.venteItemQte}> ×{l.quantite}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </Accordion>

      {/* Produits */}
      <Accordion
        header="Produits"
        count={produits.length}
        total={null}
        empty="Aucun produit vendu."
        unit="produit"
      >
        {produits.map((p, i) => {
          const art       = articles.find(a => a.id === p.articleId)
          const prixAchat = art?.prixAchatLotHT && art?.prixAchatLotQte
            ? parseFloat(art.prixAchatLotHT) / art.prixAchatLotQte
            : art?.prixAchatHT ? parseFloat(art.prixAchatHT) : null
          const marge = prixAchat !== null ? p.caHT - prixAchat * p.quantite : null
          const pct   = (p.caTTC / maxProdCA) * 100
          return (
            <div key={p.articleId} className={styles.prodRow}>
              <div className={styles.prodLeft}>
                <span className={`${styles.prodRank} ${i === 0 ? styles.prodRank1 : i === 1 ? styles.prodRank2 : i === 2 ? styles.prodRank3 : ''}`}>{i + 1}</span>
              </div>
              <div className={styles.prodBody}>
                <div className={styles.prodTop}>
                  <span className={styles.prodNom}>{p.nom}</span>
                  <span className={styles.prodExQte}>{p.quantite} ex.</span>
                  <span className={styles.prodCA}>{fEur(p.caTTC)}</span>
                </div>
                <div className={styles.prodBarTrack}>
                  <div className={styles.prodBarFill} style={{ width: `${pct}%` }} />
                </div>
                {marge !== null && (
                  <p className={styles.prodMarge}>
                    Marge : <strong style={{ color: marge >= 0 ? '#4ade80' : '#f87171' }}>{fEur(marge)}</strong>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </Accordion>

      {/* ── ACCORDÉON FRAIS ────────────────────────────────────────── */}
      <Accordion
        header="Frais de session"
        count={frais.length}
        total={totalFrais}
        color="#C85D3A"
        empty="Aucun frais enregistré pour cette session."
      >
        {frais.map(f => (
          <div key={f.id} className={`${styles.fraisAccRow} ${f.actif === false ? styles.fraisAccRowAnnule : ''}`}>
            <span className={styles.fraisAccEmoji}>{TYPE_FRAIS_EMOJI[f.type]}</span>
            <span className={styles.fraisAccMotif}>{f.motif}</span>
            <span className={styles.fraisAccType}>{TYPE_FRAIS_LABELS[f.type]}</span>
            <span className={styles.fraisAccMontant}>
              {f.montantHT ? fEur(parseFloat(f.montantHT)) : '—'}
            </span>
          </div>
        ))}
      </Accordion>

      {/* ── ACCORDÉON DROITS D'AUTEURS ─────────────────────────────── */}
      <Accordion
        header="Droits d'auteurs"
        count={droitsData?.auteurs.length ?? 0}
        total={hasDroits ? totalDroits : null}
        color="#c4b5fd"
        empty={
          can('contratsAuteurs')
            ? "Aucun droit d'auteur calculé pour cette session."
            : upgradeMessage('contratsAuteurs')
        }
      >
        {droitsData?.auteurs.map(a => {
          const pct = droitsData.totalNet > 0 ? (a.montantNet / droitsData.totalNet) * 100 : 100
          return (
            <div key={a.auteurId} className={styles.droitRow}>
              <div className={styles.droitTop}>
                <span className={styles.droitNom}>{a.nomAuteur}</span>
                <span className={styles.droitTaux}>{a.taux} % {a.base}</span>
                <span className={styles.droitNet}>{fEur(a.montantNet)}</span>
              </div>
              <div className={styles.droitBar}>
                <div className={styles.droitBarFill} style={{ width: `${pct}%` }} />
              </div>
              {a.avanceRecoupee > 0 && (
                <p className={styles.droitSub}>
                  Brut {fEur(a.montantBrut)} · À-valoir -{fEur(a.avanceRecoupee)}
                  {a.avanceRestante > 0 && ` · Restant ${fEur(a.avanceRestante)}`}
                </p>
              )}
            </div>
          )
        })}
        {hasDroits && (
          <div className={styles.droitTotal}>
            <span>Total à reverser</span>
            <strong>{fEur(totalDroits)}</strong>
          </div>
        )}
      </Accordion>

      </div>{/* scrollArea */}
    </div>
  )
}
