import { useState, useMemo } from 'react'
import { useVentes } from './hooks/useVentes'
import type { Vente } from './hooks/useVentes'
import { useFraisSession } from './hooks/useFrais'
import type { Frais } from './hooks/useFrais'
import { TYPE_FRAIS_EMOJI, TYPE_FRAIS_LABELS } from './hooks/useFrais'
import { useSessionDroits } from './hooks/useSessionDroits'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import type { Article } from '@/features/catalogue/types'
import styles from './BilanSession.module.css'

type BilanTab = 'ventes' | 'produits' | 'droits'

function fEur(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fHeure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Couleur et label par mode de paiement
const MODE_META: Record<string, { label: string; color: string }> = {
  CB:       { label: 'Carte',    color: '#3D5470' },
  ESPECES:  { label: 'Espèces', color: '#6B8F71' },
  CHEQUE:   { label: 'Chèque',  color: '#C9933A' },
  VIREMENT: { label: 'Virement',color: '#8B7BAB' },
  SUMUP:    { label: 'SumUp',   color: '#C4907C' },
  PDV:      { label: 'PDV',     color: '#C85D3A' },
}

interface Props {
  sessionId:   string
  ventes?:     Vente[]
  frais?:      Frais[]
  articles?:   Article[]
  sessionNom?: string
  pdvNom?:     string
  onClose:     () => void
}

export function BilanSession({ sessionId, ventes: ventesProp, frais: fraisProp, articles: articlesProp, sessionNom, pdvNom, onClose }: Props) {
  const [tab, setTab] = useState<BilanTab>('ventes')
  const { data: droitsData } = useSessionDroits(sessionId)

  // Fetch interne si les données ne sont pas passées en props (mode historique)
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

  const caTTC      = ventesValidees.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
  const caHT       = ventesValidees.reduce((s, v) => s + parseFloat(v.totalHT),  0)
  const caPDV      = ventesPDV.reduce((s, v)      => s + parseFloat(v.totalTTC), 0)
  const caEnCaisse = ventesDirectes.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
  const nbVentes   = ventesValidees.length
  const ticketMoyen = nbVentes > 0 ? caTTC / nbVentes : 0
  const totalFrais  = frais.filter(f => f.actif !== false).reduce((s, f) => s + (f.montantHT ? parseFloat(f.montantHT) : 0), 0)

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

  const totalDroits = droitsData?.totalNet ?? 0
  const benefice    = hasCout ? caHT - coutDesVentes - totalFrais - totalDroits : null
  const maxProdCA   = produits[0]?.caTTC ?? 1

  const hasDroits = !!(droitsData && droitsData.auteurs.length > 0)

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

        {/* ── Bande métriques ── */}
        <div className={styles.metricsStrip}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>CA total TTC</span>
            <span className={styles.metricVal}>{fEur(caTTC)}</span>
            <span className={styles.metricSub}>HT {fEur(caHT)}</span>
          </div>

          {caPDV > 0 ? (
            <>
              <div className={styles.metricDiv} />
              <div className={styles.metric}>
                <span className={styles.metricLabel}>En caisse</span>
                <span className={styles.metricVal}>{fEur(caEnCaisse)}</span>
                <span className={styles.metricSub} style={{ color: '#fbbf24' }}>+ {fEur(caPDV)} PDV</span>
              </div>
            </>
          ) : null}

          <div className={styles.metricDiv} />
          <div className={styles.metric}>
            <span className={styles.metricLabel}>{nbVentes} vente{nbVentes > 1 ? 's' : ''}</span>
            <span className={styles.metricVal}>{fEur(ticketMoyen)}</span>
            <span className={styles.metricSub}>ticket moyen</span>
          </div>

          {totalFrais > 0 && <>
            <div className={styles.metricDiv} />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Frais session</span>
              <span className={styles.metricVal}>{fEur(totalFrais)}</span>
              <span className={styles.metricSub}>{frais.length} entrée{frais.length > 1 ? 's' : ''}</span>
            </div>
          </>}

          {hasCout && <>
            <div className={styles.metricDiv} />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Coût des ventes</span>
              <span className={styles.metricVal}>{fEur(coutDesVentes)}</span>
              <span className={styles.metricSub}>prix d'achat</span>
            </div>
          </>}

          {hasDroits && <>
            <div className={styles.metricDiv} />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Droits auteurs</span>
              <span className={styles.metricVal} style={{ color: '#c4b5fd' }}>{fEur(droitsData!.totalNet)}</span>
              <span className={styles.metricSub}>{droitsData!.auteurs.length} auteur{droitsData!.auteurs.length > 1 ? 's' : ''}</span>
            </div>
          </>}

          {benefice !== null && <>
            <div className={styles.metricDiv} />
            <div className={`${styles.metric} ${styles.metricResult}`}>
              <span className={styles.metricLabel}>Bénéfice estimé HT</span>
              <span className={styles.metricVal} style={{ color: benefice >= 0 ? '#4ade80' : '#f87171' }}>
                {benefice >= 0 ? '+' : ''}{fEur(benefice)}
              </span>
              <span className={styles.metricSub}>après déductions</span>
            </div>
          </>}

          {ventesAnnulees.length > 0 && <>
            <div className={styles.metricDiv} />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Annulées</span>
              <span className={styles.metricVal} style={{ color: '#f87171' }}>{ventesAnnulees.length}</span>
              <span className={styles.metricSub}>vente{ventesAnnulees.length > 1 ? 's' : ''}</span>
            </div>
          </>}
        </div>
      </div>

      {/* ── ONGLETS ────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'ventes'   ? styles.tabActive : ''}`} onClick={() => setTab('ventes')}>
          Ventes <span className={styles.tabCount}>{ventes.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'produits' ? styles.tabActive : ''}`} onClick={() => setTab('produits')}>
          Produits <span className={styles.tabCount}>{produits.length}</span>
        </button>
        {hasDroits && (
          <button className={`${styles.tab} ${tab === 'droits' ? styles.tabActive : ''}`} onClick={() => setTab('droits')}>
            Droits <span className={styles.tabCount}>{droitsData!.auteurs.length}</span>
          </button>
        )}
      </div>

      {/* ── VENTES ─────────────────────────────────────────────────── */}
      {tab === 'ventes' && (
        <div className={styles.content}>
          {ventes.length === 0 && <p className={styles.empty}>Aucune vente enregistrée dans cette session.</p>}
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
        </div>
      )}

      {/* ── DROITS ─────────────────────────────────────────────────── */}
      {tab === 'droits' && droitsData && (
        <div className={styles.content}>
          {droitsData.auteurs.map(a => {
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
          <div className={styles.droitTotal}>
            <span>Total à reverser</span>
            <strong>{fEur(droitsData.totalNet)}</strong>
          </div>
        </div>
      )}

      {/* ── PRODUITS ───────────────────────────────────────────────── */}
      {tab === 'produits' && (
        <div className={styles.content}>
          {produits.length === 0 && <p className={styles.empty}>Aucun produit vendu.</p>}

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
                    <div className={styles.prodMargeLine}>
                      <span className={styles.prodMargeLabel}>Marge HT</span>
                      <span style={{ color: marge >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                        {marge >= 0 ? '+' : ''}{fEur(marge)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {frais.length > 0 && (
            <div className={styles.fraisSection}>
              <p className={styles.fraisSectionTitle}>Frais de session</p>
              {frais.map(f => (
                <div key={f.id} className={styles.fraisRow}>
                  <span className={styles.fraisEmoji}>{TYPE_FRAIS_EMOJI[f.type]}</span>
                  <span className={styles.fraisMotif}>{f.motif}</span>
                  <span className={styles.fraisType}>{TYPE_FRAIS_LABELS[f.type]}</span>
                  <span className={styles.fraisMontant}>{f.montantHT ? fEur(parseFloat(f.montantHT)) : '—'}</span>
                </div>
              ))}
              <div className={styles.fraisTotal}>
                <span>Total frais</span>
                <strong>{fEur(totalFrais)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
