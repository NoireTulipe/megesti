import { generateUUID } from '@/lib/utils'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useQuota, useEmissions, useReceptions, useMarquerLu,
  useCreateEmission, useProchainNumero, useRetryEmission,
  type StatutEmission, type LigneEmission, type FactureReception,
} from './hooks/useFacturation'
import { FactureReceptionModal } from './FactureReceptionModal'
import { FactureEmissionModal } from './FactureEmissionModal'
import { DestinatairePicker } from './DestinatairePicker'
import { QuotaDepaseModal } from './QuotaDepaseModal'
import styles from './FacturationPage.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fEur(v: string | number) {
  return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUT_META: Record<StatutEmission, { label: string; color: string; bg: string; dot: string }> = {
  BROUILLON: { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
  ENVOYEE:   { label: 'Envoyée',   color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  ACCEPTEE:  { label: 'Acceptée',  color: '#15803D', bg: '#F0FDF4', dot: '#22C55E' },
  REFUSEE:   { label: 'Refusée',   color: '#B91C1C', bg: '#FEF2F2', dot: '#EF4444' },
  ANNULEE:   { label: 'Annulée',   color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
}

const TVA_OPTIONS = [0, 5.5, 10, 20]
type Tab = 'overview' | 'emettre' | 'emissions' | 'receptions'

// ── Barre de quota ─────────────────────────────────────────────────────────────

function QuotaBar({ restant, quotaMois, credits }: { restant: number; quotaMois: number; credits: number }) {
  const total  = quotaMois + credits
  const used   = total - restant
  const pct    = total > 0 ? Math.min(used / total, 1) : 0
  const urgent = restant === 0
  const low    = restant > 0 && restant <= 5

  return (
    <div className={styles.quotaBar}>
      <div className={styles.quotaBarTrack}>
        <div
          className={styles.quotaBarFill}
          style={{
            width: `${pct * 100}%`,
            background: urgent ? '#EF4444' : low ? '#F59E0B' : 'linear-gradient(90deg, #6B8F71, #22C55E)',
          }}
        />
      </div>
      <div className={styles.quotaBarLabels}>
        <span style={{ color: urgent ? '#B91C1C' : low ? '#D97706' : '#15803D', fontWeight: 700 }}>
          {restant === 0 ? 'Quota épuisé' : `${restant} restante${restant > 1 ? 's' : ''}`}
        </span>
        <span className={styles.quotaBarSub}>
          {used} / {total} ce mois
          {credits > 0 && <span className={styles.creditsTag}>+{credits} crédit{credits > 1 ? 's' : ''}</span>}
        </span>
      </div>
    </div>
  )
}

// ── Formulaire émission ────────────────────────────────────────────────────────

function EmissionForm({ onSent, onQuotaDepasse }: { onSent: () => void; onQuotaDepasse: () => void }) {
  const { data: nextNum } = useProchainNumero()
  const create = useCreateEmission()

  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [dateEm,    setDateEm]    = useState(today)
  const [dateEch,   setDateEch]   = useState(in30)
  const [destinataire, setDestinataire] = useState({ nom: '', siret: '', adresse: '' })
  const [lignes,    setLignes]    = useState<LigneEmission[]>([
    { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 5.5 },
  ])
  const [error, setError] = useState<string | null>(null)

  const totaux = useMemo(() => {
    let ht = 0, tva = 0
    const tvaParTaux = new Map<number, number>()
    for (const l of lignes) {
      const lht = Math.round(l.prixUnitaireHT * l.quantite * 100) / 100
      const ltva = Math.round(lht * l.tauxTVA / 100 * 100) / 100
      ht  += lht
      tva += ltva
      tvaParTaux.set(l.tauxTVA, Math.round(((tvaParTaux.get(l.tauxTVA) ?? 0) + ltva) * 100) / 100)
    }
    return {
      ht:        Math.round(ht  * 100) / 100,
      tva:       Math.round(tva * 100) / 100,
      ttc:       Math.round((ht + tva) * 100) / 100,
      tvaParTaux: Array.from(tvaParTaux.entries()).filter(([, v]) => v > 0).sort(([a], [b]) => a - b),
    }
  }, [lignes])

  function updateLigne<K extends keyof LigneEmission>(i: number, key: K, val: LigneEmission[K]) {
    setLignes(prev => prev.map((l, j) => j === i ? { ...l, [key]: val } : l))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nextNum?.numero) return
    if (!destinataire.nom.trim()) { setError('Veuillez renseigner le destinataire.'); return }
    if (lignes.some(l => !l.description.trim())) { setError('Chaque ligne doit avoir une description.'); return }
    if (totaux.ttc <= 0) { setError('Le total ne peut pas être nul.'); return }
    try {
      await create.mutateAsync({
        id: generateUUID(), numero: nextNum.numero,
        dateEmission: `${dateEm}T00:00:00.000Z`,
        dateEcheance: `${dateEch}T00:00:00.000Z`,
        destinataireSiret:   destinataire.siret   || null,
        destinataireNom:     destinataire.nom     || null,
        destinataireAdresse: destinataire.adresse || null,
        lignes,
      })
      onSent()
    } catch (err: any) {
      if (err?.status === 402) onQuotaDepasse()
      else setError(err?.message ?? 'Erreur lors de l\'envoi.')
    }
  }

  return (
    <form className={styles.invoiceForm} onSubmit={handleSubmit}>

      {/* Entête facture */}
      <div className={styles.invoiceHeader}>
        <div className={styles.invoiceNumBlock}>
          <span className={styles.invoiceNumLabel}>N° de facture</span>
          <span className={styles.invoiceNum}>{nextNum?.numero ?? '…'}</span>
          <span className={styles.invoiceNumHint}>Attribué automatiquement</span>
        </div>
        <div className={styles.invoiceDates}>
          <div className={styles.invoiceDateField}>
            <label>Date d'émission</label>
            <input type="date" value={dateEm} onChange={e => setDateEm(e.target.value)} required className={styles.dateInput} />
          </div>
          <div className={styles.invoiceDateSep}>→</div>
          <div className={styles.invoiceDateField}>
            <label>Échéance</label>
            <input type="date" value={dateEch} onChange={e => setDateEch(e.target.value)} className={styles.dateInput} />
          </div>
        </div>
      </div>

      {/* Destinataire */}
      <div className={styles.invoiceSection}>
        <p className={styles.invoiceSectionLabel}>Destinataire</p>
        <DestinatairePicker onChange={setDestinataire} />
      </div>

      {/* Lignes */}
      <div className={styles.invoiceSection}>
        <p className={styles.invoiceSectionLabel}>Lignes</p>

        <table className={styles.lignesTable}>
          <colgroup>
            <col className={styles.colDesc} />
            <col className={styles.colQte} />
            <col className={styles.colPrix} />
            <col className={styles.colTva} />
            <col className={styles.colTot} />
            <col className={styles.colDel} />
          </colgroup>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qté</th>
              <th>Prix HT / u.</th>
              <th>TVA</th>
              <th>Total HT</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td>
                  <input className={styles.ligneInput}
                    placeholder="Description de la prestation…"
                    value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)} required />
                </td>
                <td>
                  <input className={`${styles.ligneInput} ${styles.ligneRight}`}
                    type="number" min="0.01" step="0.01" value={l.quantite}
                    onChange={e => updateLigne(i, 'quantite', Number(e.target.value))} />
                </td>
                <td>
                  <input className={`${styles.ligneInput} ${styles.ligneRight}`}
                    type="number" min="0" step="0.01" value={l.prixUnitaireHT}
                    onChange={e => updateLigne(i, 'prixUnitaireHT', Number(e.target.value))} />
                </td>
                <td>
                  <select className={`${styles.ligneInput} ${styles.ligneRight}`}
                    value={l.tauxTVA} onChange={e => updateLigne(i, 'tauxTVA', Number(e.target.value))}>
                    {TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </td>
                <td className={styles.ligneTotal}>
                  {fEur(Math.round(l.prixUnitaireHT * l.quantite * 100) / 100)}
                </td>
                <td>
                  {lignes.length > 1 && (
                    <button type="button" className={styles.ligneRemove}
                      onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className={styles.addLigneBtn}
          onClick={() => setLignes(prev => [...prev, { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 5.5 }])}>
          + Ajouter une ligne
        </button>
      </div>

      {/* Totaux */}
      <div className={styles.invoiceTotaux}>
        <div className={styles.invoiceTotauxInner}>
          <div className={styles.totauxLine}>
            <span>Total HT</span>
            <span>{fEur(totaux.ht)}</span>
          </div>
          {totaux.tvaParTaux.length > 1
            ? totaux.tvaParTaux.map(([taux, tva]) => (
                <div key={taux} className={styles.totauxLine}>
                  <span>TVA {taux} %</span>
                  <span>{fEur(tva)}</span>
                </div>
              ))
            : <div className={styles.totauxLine}><span>TVA</span><span>{fEur(totaux.tva)}</span></div>
          }
          <div className={styles.totauxLineBig}>
            <span>Total TTC</span>
            <span className={styles.totauxTTC}>{fEur(totaux.ttc)}</span>
          </div>
        </div>
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.invoiceActions}>
        <button type="submit" className={styles.btnEmettre} disabled={create.isPending || !nextNum}>
          {create.isPending ? 'Envoi en cours…' : 'Émettre la facture →'}
        </button>
      </div>
    </form>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export function FacturationPage() {
  const [tab, setTab]                             = useState<Tab>('overview')
  const [showQuotaModal, setQuotaModal]           = useState(false)
  const [selectedReception, setSelectedReception] = useState<FactureReception | null>(null)
  const [selectedEmission,  setSelectedEmission]  = useState<FactureEmission  | null>(null)
  const [searchParams]                          = useSearchParams()

  const { data: quota }      = useQuota()
  const { data: emissions  } = useEmissions()
  const { data: receptions } = useReceptions()
  const marquerLu            = useMarquerLu()
  const retryEmission        = useRetryEmission()

  useEffect(() => {
    if (searchParams.get('rechargement') === 'ok') setTab('overview')
  }, [searchParams])

  const nonLus     = receptions?.filter(r => !r.lu).length ?? 0
  const rechargeUrgent = quota && quota.restant === 0

  return (
    <div className={styles.page}>

      {/* ── En-tête ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>Facturation électronique</h1>
          {quota && (
            <QuotaBar restant={quota.restant} quotaMois={quota.quotaMois} credits={quota.creditsSupp} />
          )}
        </div>
        <div className={styles.pageHeaderRight}>
          {rechargeUrgent && (
            <button className={styles.btnRechargeUrgent} onClick={() => setQuotaModal(true)}>
              ⚡ Recharger le facturier
            </button>
          )}
          <button
            className={styles.btnEmettrePrimary}
            onClick={() => setTab('emettre')}
          >
            + Nouvelle facture
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {([
          ['overview',  '🏠', 'Tableau de bord'],
          ['emettre',   '✦',  'Émettre'],
          ['emissions', '↗',  `Émises (${emissions?.length ?? 0})`],
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <button key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            <span className={styles.tabIcon}>{icon}</span>
            {label}
          </button>
        ))}
        <button
          className={`${styles.tab} ${tab === 'receptions' ? styles.tabActive : ''}`}
          onClick={() => setTab('receptions')}
        >
          <span className={styles.tabIcon}>↙</span>
          Reçues
          {nonLus > 0 && (
            <span className={styles.tabBadge}>
              {nonLus} nouvelle{nonLus > 1 ? 's' : ''}
            </span>
          )}
          {nonLus === 0 && ` (${receptions?.length ?? 0})`}
        </button>
      </div>

      <div className={styles.body}>

        {/* ── Tableau de bord ── */}
        {tab === 'overview' && (
          <div className={styles.overview}>

            {searchParams.get('rechargement') === 'ok' && (
              <div className={styles.successBanner}>
                ✓ Rechargement confirmé — vos crédits sont disponibles immédiatement.
              </div>
            )}

            {/* Stats */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#6B8F71,#22C55E)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.statVal}>{emissions?.filter(e => e.statut !== 'BROUILLON').length ?? 0}</div>
                  <div className={styles.statLabel}>Factures émises ce mois</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.statVal}>{receptions?.length ?? 0}</div>
                  <div className={styles.statLabel}>Factures reçues</div>
                </div>
              </div>

              {nonLus > 0 && (
                <div className={styles.statCard} style={{ borderColor: '#FECACA' }}>
                  <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.statVal} style={{ color: '#B91C1C' }}>{nonLus}</div>
                    <div className={styles.statLabel}>Non lues</div>
                  </div>
                </div>
              )}

              {quota && (
                <div className={styles.statCard} style={{ borderColor: rechargeUrgent ? '#FECACA' : undefined }}>
                  <div className={styles.statIcon}
                    style={{ background: rechargeUrgent ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : 'linear-gradient(135deg,var(--terra),var(--terra-dark,#a06050))' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.statVal} style={{ color: rechargeUrgent ? '#B91C1C' : undefined }}>
                      {quota.restant}
                    </div>
                    <div className={styles.statLabel}>
                      {rechargeUrgent ? 'Quota épuisé !' : `Factures restantes`}
                    </div>
                    {rechargeUrgent && (
                      <button className={styles.rechargeInline} onClick={() => setQuotaModal(true)}>
                        Recharger →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dernières émissions */}
            {emissions && emissions.length > 0 && (
              <div className={styles.recentBlock}>
                <h3 className={styles.recentTitle}>Dernières factures émises</h3>
                {emissions.slice(0, 5).map(f => {
                  const meta = STATUT_META[f.statut]
                  return (
                    <div key={f.id} className={styles.recentRow}>
                      <div className={styles.recentLeft}>
                        <span className={styles.recentNum}>{f.numero}</span>
                        <span className={styles.recentDest}>{f.destinataireNom ?? '—'}</span>
                      </div>
                      <div className={styles.recentRight}>
                        <span className={styles.recentDate}>{fDateShort(f.dateEmission)}</span>
                        <span className={styles.recentMontant}>{fEur(f.montantTTC)}</span>
                        <span className={styles.statutPill} style={{ color: meta.color, background: meta.bg }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', marginRight: 5 }} />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Émettre ── */}
        {tab === 'emettre' && (
          <div className={styles.emettreLayout}>
            <EmissionForm
              onSent={() => setTab('emissions')}
              onQuotaDepasse={() => setQuotaModal(true)}
            />
            <aside className={styles.mascotPanel}>
              <img src="/img/mascotte/m2.png" alt="MeGestine" className={styles.mascotImg} />
              <div className={styles.mascotBubble}>
                <p className={styles.mascotBubbleTitle}>Facturation électronique</p>
                <p className={styles.mascotBubbleText}>
                  Chaque facture est générée au format <strong>UBL 2.1 / Factur-X</strong>, conforme à
                  la norme européenne <strong>EN 16931</strong> — obligatoire pour le B2B dès 2026.
                </p>
              </div>
              {quota && (
                <div className={styles.mascotQuota}>
                  <span
                    className={styles.mascotQuotaCount}
                    style={{ color: quota.restant === 0 ? '#B91C1C' : quota.restant <= 5 ? '#D97706' : '#15803D' }}
                  >
                    {quota.restant}
                  </span>
                  <span className={styles.mascotQuotaLabel}>
                    {quota.restant === 0
                      ? 'Quota épuisé'
                      : `facture${quota.restant > 1 ? 's' : ''} restante${quota.restant > 1 ? 's' : ''}`}
                  </span>
                  <span className={styles.mascotQuotaMeta}>
                    sur {quota.quotaMois + quota.creditsSupp} ce mois
                  </span>
                  {quota.restant === 0 && (
                    <button className={styles.rechargeInline} onClick={() => setQuotaModal(true)}>
                      Recharger →
                    </button>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ── Émissions ── */}
        {tab === 'emissions' && (
          <div className={styles.listBlock}>
            {!emissions?.length && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📄</div>
                <p className={styles.emptyTitle}>Aucune facture émise</p>
                <button className={styles.btnEmettrePrimary} onClick={() => setTab('emettre')}>
                  Émettre ma première facture
                </button>
              </div>
            )}
            {emissions?.map(f => {
              const meta = STATUT_META[f.statut]
              return (
                <div key={f.id} className={styles.factureCard}
                  style={{ cursor: 'pointer' }}
                  onClick={() => f.statut !== 'BROUILLON' && setSelectedEmission(f)}>
                  <div className={styles.factureCardAccent} style={{ background: meta.dot }} />
                  <div className={styles.factureCardBody}>
                    <div className={styles.factureCardLeft}>
                      <div className={styles.factureCardNum}>{f.numero}</div>
                      <div className={styles.factureCardDest}>{f.destinataireNom ?? '—'}</div>
                      {f.destinataireSiret && <div className={styles.factureCardSiret}>{f.destinataireSiret}</div>}
                      {f.statut === 'BROUILLON' && (
                        <button
                          className={styles.retryBtn}
                          disabled={retryEmission.isPending}
                          onClick={() => retryEmission.mutate(f.id)}
                        >
                          {retryEmission.isPending ? 'Envoi…' : '↻ Réessayer l\'envoi'}
                        </button>
                      )}
                    </div>
                    <div className={styles.factureCardRight}>
                      <div className={styles.factureCardDate}>{fDate(f.dateEmission)}</div>
                      <div className={styles.factureCardMontant}>{fEur(f.montantTTC)}</div>
                      <span className={styles.statutPill} style={{ color: meta.color, background: meta.bg }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', marginRight: 5 }} />
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Réceptions ── */}
        {tab === 'receptions' && (
          <div className={styles.listBlock}>
            {!receptions?.length && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📬</div>
                <p className={styles.emptyTitle}>Aucune facture reçue</p>
                <p className={styles.emptyDesc}>Les factures envoyées par vos fournisseurs apparaîtront ici automatiquement.</p>
              </div>
            )}
            {receptions?.map(f => (
              <div key={f.id}
                className={`${styles.factureCard} ${!f.lu ? styles.factureCardUnread : ''}`}
                onClick={() => {
                  if (!f.lu) marquerLu.mutate(f.id)
                  setSelectedReception(f)
                }}
                style={{ cursor: 'pointer' }}
              >
                {!f.lu && <div className={styles.unreadBadge}>Nouvelle facture</div>}
                <div className={styles.factureCardAccent} style={{ background: f.lu ? '#9CA3AF' : '#3B82F6' }} />
                <div className={styles.factureCardBody}>
                  <div className={styles.factureCardLeft}>
                    <div className={styles.factureCardDest}>{f.emetteurNom ?? 'Émetteur inconnu'}</div>
                    {f.numeroFacture && <div className={styles.factureCardNum}>{f.numeroFacture}</div>}
                  </div>
                  <div className={styles.factureCardRight}>
                    <div className={styles.factureCardDate}>{fDate(f.dateReception)}</div>
                    <div className={styles.factureCardMontant}>{fEur(f.montantTTC)}</div>
                    <span className={styles.statutPill}
                      style={{ color: f.lu ? '#6B7280' : '#2563EB', background: f.lu ? '#F3F4F6' : '#EFF6FF' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.lu ? '#9CA3AF' : '#3B82F6', display: 'inline-block', marginRight: 5 }} />
                      {f.lu ? 'Lue' : 'Nouvelle'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showQuotaModal && <QuotaDepaseModal onClose={() => setQuotaModal(false)} />}

      {selectedReception && (
        <FactureReceptionModal
          facture={selectedReception}
          onClose={() => setSelectedReception(null)}
        />
      )}

      {selectedEmission && (
        <FactureEmissionModal
          facture={selectedEmission}
          onClose={() => setSelectedEmission(null)}
        />
      )}
    </div>
  )
}
