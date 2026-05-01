import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  useSoldesDroitsAuteur, useCalendrierDroitsAuteur,
  useHistoriquePaiements, useStatsDroitsAuteur,
  useCreatePaiementDA, usePatchPaiementDA,
} from './hooks/useDroitsAuteur'
import type { SoldeContrat } from './hooks/useDroitsAuteur'
import styles from './DroitsAuteurPage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Modal paiement ────────────────────────────────────────────────────────────

interface ModalPaiementProps {
  contrat: SoldeContrat
  onClose: () => void
}

function ModalPaiement({ contrat, onClose }: ModalPaiementProps) {
  const create = useCreatePaiementDA()
  const today  = new Date().toISOString().slice(0, 10)
  const [montant, setMontant]       = useState(String(contrat.solde))
  const [dateVersement, setDate]    = useState(today)
  const [dateDebut, setDateDebut]   = useState(today)
  const [dateFin, setDateFin]       = useState(today)
  const [mode, setMode]             = useState<'VIREMENT' | 'CHEQUE'>('VIREMENT')
  const [reference, setReference]   = useState('')
  const [notes, setNotes]           = useState('')

  async function handleSubmit() {
    await create.mutateAsync({
      id:               crypto.randomUUID(),
      contratId:        contrat.contratId,
      montant:          Number(montant),
      dateVersement:    `${dateVersement}T00:00:00.000Z`,
      dateDebutPeriode: `${dateDebut}T00:00:00.000Z`,
      dateFinPeriode:   `${dateFin}T00:00:00.000Z`,
      modePaiement:     mode,
      reference:        reference || undefined,
      notes:            notes || undefined,
    })
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Enregistrer un paiement</h3>
        <p className={styles.modalSub}>{contrat.auteurNom} · {contrat.articleNom ?? 'Tous les articles'}</p>

        <div className={styles.modalGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Montant (€)</label>
            <input type="number" step="0.01" className={styles.input} value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Date de versement</label>
            <input type="date" className={styles.input} value={dateVersement} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Période du</label>
            <input type="date" className={styles.input} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Au</label>
            <input type="date" className={styles.input} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
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
            <input type="text" className={styles.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° virement…" />
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: 8 }}>
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
  )
}

// ── Onglet Échéances ──────────────────────────────────────────────────────────

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
      <div className={styles.empty}>
        <span style={{ fontSize: '2.5rem' }}>📝</span>
        <p>Aucun contrat actif avec droits configurés.</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
          Configurez la périodicité dans les fiches auteurs.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Auteur</span>
          <span>Article</span>
          <span>Périodicité</span>
          <span>Prochain versement</span>
          <span style={{ textAlign: 'right' }}>Droits bruts</span>
          <span style={{ textAlign: 'right' }}>À-valoir restant</span>
          <span style={{ textAlign: 'right' }}>Déjà versé</span>
          <span style={{ textAlign: 'right' }}>Solde</span>
          <span />
        </div>
        {tries.map((s) => (
          <div key={s.contratId} className={`${styles.tableRow} ${urgencyClass(s.prochainVersement)}`}>
            <span className={styles.nomCell}>{s.auteurNom}</span>
            <span className={styles.soft}>{s.articleNom ?? <em>Tous</em>}</span>
            <span className={styles.soft}>{s.periodicite ? PERIODICITE_LABELS[s.periodicite] : '—'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {s.prochainVersement ? (
                <>
                  <span className={styles.dateCell}>{fmtDate(s.prochainVersement)}</span>
                  {new Date(s.prochainVersement) < new Date() && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#FEE2E2', color: '#DC2626' }}>
                      En retard
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.soft}>—</span>
              )}
            </span>
            <span style={{ textAlign: 'right' }}>{fmtEuro(s.totalDuBrut)}</span>
            <span style={{ textAlign: 'right', color: s.avanceRestante > 0 ? 'var(--gold)' : 'var(--text-soft)' }}>
              {s.avanceRestante > 0 ? fmtEuro(s.avanceRestante) : '—'}
            </span>
            <span style={{ textAlign: 'right', color: 'var(--text-soft)' }}>{fmtEuro(s.totalVerse)}</span>
            <span style={{ textAlign: 'right', fontWeight: 700, color: s.solde > 0 ? '#059669' : 'var(--text-soft)' }}>
              {fmtEuro(s.solde)}
            </span>
            <span>
              {s.solde > 0 && (
                <button className={styles.btnPayer} onClick={() => setModal(s)}>
                  Payer
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      {modal && <ModalPaiement contrat={modal} onClose={() => setModal(null)} />}
    </>
  )
}

// ── Onglet Historique ─────────────────────────────────────────────────────────

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
    <div className={styles.empty}>
      <span style={{ fontSize: '2.5rem' }}>🗓️</span>
      <p>Aucun paiement enregistré.</p>
    </div>
  )

  return (
    <div className={styles.table}>
      <div className={`${styles.tableHead} ${styles.tableHeadHisto}`}>
        <span>Date</span>
        <span>Auteur</span>
        <span>Article</span>
        <span>Période couverte</span>
        <span style={{ textAlign: 'right' }}>Montant</span>
        <span>Mode</span>
        <span>Référence</span>
        <span>Statut</span>
        <span />
      </div>
      {paiements.map((p) => {
        const s = STATUT_STYLES[p.statut]
        return (
          <div key={p.id} className={styles.tableRow}>
            <span>{fmtDate(p.dateVersement)}</span>
            <span className={styles.nomCell}>{p.auteur.prenom} {p.auteur.nom}</span>
            <span className={styles.soft}>{p.contrat.article?.nom ?? <em>Tous</em>}</span>
            <span className={styles.soft}>{fmtDate(p.dateDebutPeriode)} → {fmtDate(p.dateFinPeriode)}</span>
            <span style={{ textAlign: 'right', fontWeight: 700 }}>{fmtEuro(Number(p.montant))}</span>
            <span className={styles.soft}>{p.modePaiement ?? '—'}</span>
            <span className={styles.soft}>{p.reference ?? '—'}</span>
            <span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: s.color, background: s.bg }}>
                {s.label}
              </span>
            </span>
            <span>
              {p.statut === 'PREVU' && (
                <button className={styles.btnPayer} onClick={() => patch.mutate({ id: p.id, statut: 'PAYE' })}>
                  Confirmer
                </button>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Onglet Par auteur ─────────────────────────────────────────────────────────

const COLORS = ['#C4907C','#8B7BAB','#6B8F71','#C9933A','#3D5470','#A07090','#5B8A8A']

function OngletStats() {
  const { data: stats = [], isLoading } = useStatsDroitsAuteur()
  const { data: soldes = [] }           = useSoldesDroitsAuteur()

  if (isLoading) return <div className={styles.loading}>Chargement…</div>
  if (stats.length === 0) return (
    <div className={styles.empty}>
      <span style={{ fontSize: '2.5rem' }}>📊</span>
      <p>Aucun versement enregistré.</p>
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

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = 'echeances' | 'historique' | 'stats'

export function DroitsAuteurPage() {
  const [tab, setTab] = useState<Tab>('echeances')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Droits d'auteur</h1>
          <p className={styles.subtitle}>Suivi des reversements dus et versés</p>
        </div>
      </header>

      <div className={styles.tabBar}>
        {([
          ['echeances',  'Échéances & soldes'],
          ['historique', 'Historique des paiements'],
          ['stats',      'Par auteur'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
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
