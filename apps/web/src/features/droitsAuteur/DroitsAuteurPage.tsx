import { generateUUID } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { DateInput } from '@/components/DateInput'
import { Overlay } from '@/components/ui/Overlay'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  useSoldesDroitsAuteur, useCalendrierDroitsAuteur,
  useHistoriquePaiements, useStatsDroitsAuteur,
  useCreatePaiementDA, usePatchPaiementDA,
} from './hooks/useDroitsAuteur'
import type { SoldeContrat } from './hooks/useDroitsAuteur'
import { buildReference } from '@megesti/business/droits/reference'
import { PageHero } from '@/components/PageHero'
import styles from './DroitsAuteurPage.module.css'

// •"?•"? Helpers •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtEuro = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const PERIODICITE_LABELS: Record<string, string> = {
  MENSUEL: 'Mensuel', TRIMESTRIEL: 'Trimestriel', TOUS_LES_4_MOIS: 'Tous les 4 mois',
  SEMESTRIEL: 'Semestriel', ANNUEL: 'Annuel', DATES_FIXES: 'Dates fixes',
}

function urgencyClass(prochainVersement: string | null): string {
  if (!prochainVersement) return ''
  const jours = Math.ceil((new Date(prochainVersement).getTime() - Date.now()) / 86400000)
  if (jours < 0)  return styles.urgenceRetard
  if (jours <= 7) return styles.urgenceSemaine
  return styles.urgenceOk
}

// •"?•"? Modal paiement •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

interface ModalPaiementProps {
  contrat: SoldeContrat
  onClose: () => void
}

function ModalPaiement({ contrat, onClose }: ModalPaiementProps) {
  const create = useCreatePaiementDA()
  const { data: allPaiements = [] } = useHistoriquePaiements()
  const today  = new Date().toISOString().slice(0, 10)
  const [montant, setMontant]       = useState(String(contrat.solde))
  const [dateVersement, setDate]    = useState(today)
  const [dateDebut, setDateDebut]   = useState(today)
  const [dateFin, setDateFin]       = useState(today)
  const [mode, setMode]             = useState<'VIREMENT' | 'CHEQUE'>('VIREMENT')
  const [notes, setNotes]           = useState('')

  // Compteur de paiements existants pour ce contrat
  const paiementsContrat = allPaiements.filter(
    p => p.contratId === contrat.contratId && p.statut !== 'ANNULE'
  )
  const numeroOrdre = paiementsContrat.length + 1
  const anneeVersement = dateVersement.slice(0, 4)
  const reference = buildReference(contrat.auteurNom, contrat.articleNom, anneeVersement, numeroOrdre)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit() {
    await create.mutateAsync({
      id:               generateUUID(),
      contratId:        contrat.contratId,
      montant:          Number(montant),
      dateVersement:    `${dateVersement}T00:00:00.000Z`,
      dateDebutPeriode: `${dateDebut}T00:00:00.000Z`,
      dateFinPeriode:   `${dateFin}T00:00:00.000Z`,
      modePaiement:     mode,
      reference,
      notes:            notes || undefined,
    })
    onClose()
  }

  return (
    <Overlay className={styles.modalOverlay} onClose={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalAccent} />
        <div className={styles.modalDecorations}>
          <div className={styles.modalBlobA} />
          <div className={styles.modalBlobB} />
        </div>

        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Enregistrer un paiement</h3>
            <p className={styles.modalSub}>{contrat.auteurNom} · {contrat.articleNom ?? 'Tous les articles'}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Montant (€)</label>
              <input type="number" step="0.01" className={styles.input} value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Date de versement</label>
              <DateInput value={dateVersement} onChange={setDate} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Période du</label>
              <DateInput value={dateDebut} onChange={setDateDebut} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Au</label>
              <DateInput value={dateFin} onChange={setDateFin} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mode</label>
              <select className={styles.input} value={mode} onChange={(e) => setMode(e.target.value as 'VIREMENT' | 'CHEQUE')}>
                <option value="VIREMENT">Virement</option>
                <option value="CHEQUE">Chèque</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Référence</label>
              <input type="text" className={styles.input} value={reference} readOnly tabIndex={-1}
                style={{ background: 'var(--cream)', color: 'var(--text-mid)', cursor: 'default', userSelect: 'all' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-soft)', fontStyle: 'italic', marginTop: 2 }}>
                Générée automatiquement — {numeroOrdre > 1 ? `${paiementsContrat.length} paiement(s) existant(s)` : 'premier paiement'}
              </span>
            </div>
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className={styles.modalSolde}>
            Solde disponible : <strong>{fmtEuro(contrat.solde)}</strong>
            {contrat.avanceRestante > 0 && <span className={styles.avanceBadge}>À-valoir restant : {fmtEuro(contrat.avanceRestante)}</span>}
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={onClose}>Annuler</button>
            <button
              className={styles.btnSave}
              disabled={!montant || Number(montant) <= 0 || create.isPending}
              onClick={handleSubmit}
            >
              {create.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// •"?•"? Onglet … •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function OngletEcheances() {
  const { data: soldes = [], isLoading } = useSoldesDroitsAuteur()
  const [modal, setModal] = useState<SoldeContrat | null>(null)

  const tries = [...soldes].sort((a, b) => {
    if (!a.prochainVersement && !b.prochainVersement) return 0
    if (!a.prochainVersement) return 1
    if (!b.prochainVersement) return -1
    return new Date(a.prochainVersement).getTime() - new Date(b.prochainVersement).getTime()
  })

  if (isLoading) return <div className={styles.loading}>Calcul en cours…</div>

  if (tries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div className={styles.emptyTitle}>Aucun contrat actif avec droits configurés</div>
        <div className={styles.emptyDesc}>Configurez la périodicité dans les fiches auteurs.</div>
      </div>
    )
  }

  return (
    <>
      <div className={styles.table}>
        {tries.map((s) => {
          const prochain = s.prochainVersement ? new Date(s.prochainVersement) : null
          const enRetard = prochain && prochain < new Date()
          const urgent   = prochain && !enRetard && (prochain.getTime() - Date.now()) / 86400000 <= 14

          return (
            <div key={s.contratId} className={`${styles.tableCard} ${urgencyClass(s.prochainVersement)}`}>
              {/* Ligne haute : identité + périodicité + échéance */}
              <div className={styles.cardMain}>
                <div className={styles.cardLeft}>
                  <span className={styles.cardAuteur}>{s.auteurNom}</span>
                  <span className={styles.cardArticle}>{s.articleNom ?? 'Tous les articles'}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardPeriodBadge}>
                    {s.periodicite ? PERIODICITE_LABELS[s.periodicite] : '—'}
                  </span>
                  <div className={styles.cardVersement}>
                    {prochain ? (
                      <>
                        <span className={`${styles.cardDate} ${enRetard ? styles.cardDateRetard : ''} ${!enRetard && !urgent ? styles.cardDateFuture : ''}`}>
                          {enRetard && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          )}
                          {fmtDate(s.prochainVersement!)}
                        </span>
                        {enRetard && <span className={styles.cardRetardBadge}>En retard</span>}
                        {urgent && <span className={styles.cardUrgentBadge}>Imminent</span>}
                      </>
                    ) : (
                      <span className={styles.cardDate} style={{color:'var(--text-soft)'}}>—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ligne basse : montants + action */}
              <div className={styles.cardAmounts}>
                <div className={styles.amountItem}>
                  <span className={styles.amountLabel}>Droits bruts</span>
                  <span className={styles.amountValue}>{fmtEuro(s.totalDuBrut)}</span>
                </div>
                <div className={styles.amountItem}>
                  <span className={styles.amountLabel}>À-valoir</span>
                  {s.avanceRestante > 0 ? (
                    <span className={styles.amountAvance}>{fmtEuro(s.avanceRestante)}</span>
                  ) : (
                    <span className={styles.amountValue} style={{color:'var(--text-soft)'}}>—</span>
                  )}
                </div>
                <div className={styles.amountItem}>
                  <span className={styles.amountLabel}>Déjà versé</span>
                  <span className={styles.amountValue} style={{color:'var(--text-soft)'}}>{fmtEuro(s.totalVerse)}</span>
                </div>
                <div className={styles.amountItem}>
                  <span className={styles.amountLabel}>Solde</span>
                  <span className={s.solde > 0 ? styles.amountSolde : styles.amountSoldeZero}>
                    {fmtEuro(s.solde)}
                  </span>
                </div>
                {s.solde > 0 && (
                  <button className={styles.btnPayer} onClick={() => setModal(s)}>
                    Payer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {modal && <ModalPaiement contrat={modal} onClose={() => setModal(null)} />}
    </>
  )
}

// •"?•"? Onglet Historique •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

function OngletHistorique() {
  const { data: paiements = [], isLoading } = useHistoriquePaiements()
  const patch = usePatchPaiementDA()

  const STATUT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
    PREVU:  { color: '#92400E', bg: '#FEF3C7', label: 'Prévu'  },
    PAYE:   { color: '#065F46', bg: '#D1FAE5', label: 'Payé'   },
    ANNULE: { color: '#991B1B', bg: '#FEE2E2', label: 'Annulé' },
  }

  if (isLoading) return <div className={styles.loading}>Chargement…</div>
  if (paiements.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div className={styles.emptyTitle}>Aucun paiement enregistré</div>
    </div>
  )

  return (
    <div className={styles.table}>
      <div className={styles.histoHeader}>
        <span>Date</span>
        <span>Auteur</span>
        <span>Détails</span>
        <span>Montant</span>
        <span />
      </div>
      {paiements.map((p) => {
        const st = STATUT_STYLES[p.statut]
        return (
          <div key={p.id} className={styles.tableCardSm}>
            <div className={styles.cardSmMain}>
              <span className={styles.cardSmDate}>{fmtDate(p.dateVersement)}</span>
              <span className={styles.cardSmAuteur}>{p.auteur.prenom} {p.auteur.nom}</span>
              <div className={styles.cardSmDetails}>
                <span>{p.contrat.article?.nom ?? 'Tous les articles'}</span>
                <span style={{color:'var(--text-mid)'}}>·</span>
                <span>{fmtDate(p.dateDebutPeriode)} → {fmtDate(p.dateFinPeriode)}</span>
                {p.modePaiement && (
                  <>
                    <span style={{color:'var(--text-mid)'}}>·</span>
                    <span>{p.modePaiement}</span>
                  </>
                )}
                {p.reference && (
                  <>
                    <span style={{color:'var(--text-mid)'}}>·</span>
                    <span style={{fontWeight:500}}>{p.reference}</span>
                  </>
                )}
              </div>
            </div>
            <div className={styles.cardSmRight}>
              <span className={styles.cardSmMontant}>{fmtEuro(Number(p.montant))}</span>
              <span className={styles.cardSmStatut} style={{color: st.color, background: st.bg}}>
                {st.label}
              </span>
              {p.statut === 'PREVU' && (
                <button className={styles.btnPayer} onClick={() => patch.mutate({ id: p.id, statut: 'PAYE' })}>
                  Confirmer
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// •"?•"? Onglet Par auteur •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

const COLORS = ['#C4907C','#8B7BAB','#6B8F71','#C9933A','#3D5470','#A07090','#5B8A8A']

function OngletStats() {
  const { data: stats = [], isLoading } = useStatsDroitsAuteur()
  const { data: soldes = [] }           = useSoldesDroitsAuteur()

  if (isLoading) return <div className={styles.loading}>Chargement…</div>
  if (stats.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <div className={styles.emptyTitle}>Aucun versement enregistré</div>
    </div>
  )

  const soldeByAuteur = new Map(soldes.map((s) => [s.auteurId, s.solde]))
  const chartData = stats.map((s) => ({
    nom:   `${s.auteur.prenom.charAt(0)}. ${s.auteur.nom}`,
    verse: s.total,
    solde: soldeByAuteur.get(s.auteur.id) ?? 0,
  }))

  return (
    <div className={styles.statsLayout}>
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Droits versés par auteur (€)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v} €`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmtEuro(v)} />
            <Bar dataKey="verse" name="Versé" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.rankingList}>
        {stats.map((s, i) => {
          const solde = soldeByAuteur.get(s.auteur.id) ?? 0
          return (
            <div key={s.auteur.id} className={styles.rankingRow}>
              <span className={styles.rankNum}>#{i + 1}</span>
              <div className={styles.rankInfo}>
                <span className={styles.rankNom}>{s.auteur.prenom} {s.auteur.nom}</span>
                <div className={styles.rankBar}>
                  <div
                    className={styles.rankBarFill}
                    style={{
                      width: `${(s.total / (stats[0]?.total || 1)) * 100}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
              <div className={styles.rankAmounts}>
                <span className={styles.rankTotal}>{fmtEuro(s.total)}</span>
                {solde > 0 && <span className={styles.rankSolde}>+{fmtEuro(solde)} à verser</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// •"?•"? Page principale •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

type Tab = 'echeances' | 'historique' | 'stats'

export function DroitsAuteurPage() {
  const [tab, setTab] = useState<Tab>('echeances')

  return (
    <div className={styles.page}>
      <PageHero title="Droits d'auteur" subtitle="Suivi des reversements dus et versés" />

      <div className={styles.tabBar}>
        {([
          ['echeances',  'Échéances & soldes', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )],
          ['historique', 'Historique des paiements', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          )],
          ['stats',      'Par auteur', (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          )],
        ] as [Tab, string, JSX.Element][]).map(([key, label, icon]) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'echeances'  && <OngletEcheances />}
        {tab === 'historique' && <OngletHistorique />}
        {tab === 'stats'      && <OngletStats />}
      </div>
    </div>
  )
}




