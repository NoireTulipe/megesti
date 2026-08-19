import { generateUUID } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { DateInput } from '@/components/DateInput'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useCharges, useCreateCharge, useUpdateCharge, useDeleteCharge,
  TYPE_CHARGE_LABELS, TYPE_CHARGE_COLORS, PERIODICITE_LABELS,
  CATEGORIE_CHARGE_LABELS, CATEGORIE_CHARGE_COLORS, defaultCategorie,
  occurrencesDansPeriode, chargeEstDansPeriode,
  type TypeCharge, type Periodicite, type CategorieCharge, type Charge,
} from '@/features/comptabilite/hooks/useCharges'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import { isoToInput, todayISO, toLocalISO } from '@/lib/date'
import { PageHero } from '@/components/PageHero'
import styles from './ChargesPage.module.css'

// •"?•"? Helpers •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
function fEur(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function joursAvant(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// •"?•"? Presets de période •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
function startOfMonth()   { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) }
function startOfQuarter() { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1) }
function startOfYear()    { return new Date(new Date().getFullYear(), 0, 1) }
function endOfToday()     { const d = new Date(); d.setHours(23, 59, 59, 999); return d }

const PRESETS = [
  { key: 'month',   label: 'Ce mois',      getFrom: startOfMonth   },
  { key: 'quarter', label: 'Ce trimestre', getFrom: startOfQuarter },
  { key: 'year',    label: 'Cette année',  getFrom: startOfYear    },
  { key: 'all',     label: 'Tout',         getFrom: () => new Date('2000-01-01') },
  { key: 'custom',  label: 'Personnalisé', getFrom: startOfYear    },
] as const
type PresetKey = typeof PRESETS[number]['key']

// •"?•"? Formulaire •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
interface FormProps { initial?: Charge | null; onDone: () => void }

function ChargeForm({ initial, onDone }: FormProps) {
  const franchiseTVA = useFranchiseTVA()
  const create = useCreateCharge()
  const update = useUpdateCharge()

  const [libelle,     setLibelle]     = useState(initial?.libelle    ?? '')
  const [montant,     setMontant]     = useState(initial ? String(parseFloat(initial.montantHT)) : '')
  const [type,        setType]        = useState<TypeCharge>(initial?.type ?? 'DEPENSE')
  const [categorie,   setCategorie]   = useState<CategorieCharge>(initial?.categorie ?? defaultCategorie(initial?.type ?? 'DEPENSE'))
  const [statut,      setStatut]      = useState<'PREVU'|'PAYE'>(initial?.statut ?? 'PREVU')
  const [dateEffet,   setDateEffet]   = useState(initial?.dateEffet ? isoToInput(initial.dateEffet) : todayISO())
  const [datePaiement, setDatePaiement] = useState(initial?.datePaiement ? isoToInput(initial.datePaiement) : '')
  const [periodicite, setPeriodicite] = useState<Periodicite | ''>(initial?.periodicite ?? '')
  const [notes,       setNotes]       = useState(initial?.notes ?? '')

  const isAbo     = type === 'ABONNEMENT'
  const isLoading = create.isPending || update.isPending

  function handleTypeChange(t: TypeCharge) {
    setType(t)
    setCategorie(defaultCategorie(t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      libelle, montantHT: parseFloat(montant), type, categorie, notes: notes || undefined,
      dateEffet: new Date(dateEffet).toISOString(),
      ...(isAbo
        ? { periodicite: periodicite || undefined }
        : { statut, datePaiement: datePaiement ? new Date(datePaiement).toISOString() : undefined }
      ),
    }
    if (initial) await update.mutateAsync({ id: initial.id, ...body })
    else         await create.mutateAsync({ id: generateUUID(), ...body })
    onDone()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Type (récurrence)</label>
          <div className={styles.typeSelector}>
            {(['DEPENSE','ABONNEMENT','PERTE'] as TypeCharge[]).map(t => (
              <button key={t} type="button"
                className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
                style={type === t ? { background: TYPE_CHARGE_COLORS[t], color: 'white', borderColor: TYPE_CHARGE_COLORS[t] } : {}}
                onClick={() => handleTypeChange(t)}>
                {TYPE_CHARGE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Catégorie comptable (PCG)</label>
          <div className={styles.typeSelector} style={{ flexWrap: 'wrap' }}>
            {(Object.keys(CATEGORIE_CHARGE_LABELS) as CategorieCharge[]).map(cat => (
              <button key={cat} type="button"
                className={`${styles.typeBtn} ${categorie === cat ? styles.typeBtnActive : ''}`}
                style={categorie === cat ? { background: CATEGORIE_CHARGE_COLORS[cat], color: 'white', borderColor: CATEGORIE_CHARGE_COLORS[cat] } : {}}
                onClick={() => setCategorie(cat)}>
                {CATEGORIE_CHARGE_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup} style={{ flex: 2 }}>
          <label className={styles.formLabel}>Libellé</label>
          <input className={styles.formInput} value={libelle} onChange={e => setLibelle(e.target.value)}
            placeholder={isAbo ? 'ex. Abonnement Stripe' : 'ex. Stand salon Paris'} required />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{franchiseTVA ? 'Montant (€)' : 'Montant HT (€)'}</label>
          <input className={styles.formInput} type="number" min="0" step="0.01" value={montant} onChange={e => setMontant(e.target.value)} required />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{isAbo ? 'Date de début' : 'Date d\'effet'}</label>
          <DateInput value={dateEffet} onChange={setDateEffet} className={styles.formInput} />
        </div>

        {isAbo ? (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Périodicité</label>
            <select className={styles.formInput} value={periodicite} onChange={e => setPeriodicite(e.target.value as Periodicite)}>
              <option value="">— aucune —</option>
              {(['MENSUELLE','TRIMESTRIELLE','SEMESTRIELLE','ANNUELLE'] as Periodicite[]).map(p => (
                <option key={p} value={p}>{PERIODICITE_LABELS[p]}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Statut</label>
              <select className={styles.formInput} value={statut} onChange={e => setStatut(e.target.value as 'PREVU'|'PAYE')}>
                <option value="PREVU">Prévu</option>
                <option value="PAYE">Payé</option>
              </select>
            </div>
            {statut === 'PAYE' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date de paiement</label>
                <DateInput value={datePaiement} onChange={setDatePaiement} className={styles.formInput} />
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Notes <span className={styles.optional}>(optionnel)</span></label>
        <input className={styles.formInput} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques, référence contrat…" />
      </div>

      {isAbo && periodicite && (
        <p className={styles.aboHint}>
          Les occurrences sont calculées automatiquement. Chaque date passée compte comme payée dans le bilan.
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.btnCancel} onClick={onDone}>Annuler</button>
        <button type="submit" className={styles.btnSubmit} disabled={isLoading}>
          {isLoading ? 'Enregistrement…' : initial ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}

// •"?•"? Card charge •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
interface CardProps {
  charge:       Charge
  occurrences?: Date[]   // pour les abonnements filtrés sur une période
  onEdit:       () => void
  onDelete:     () => void
}

function ChargeCard({ charge: c, occurrences, onEdit, onDelete }: CardProps) {
  const isAbo    = c.type === 'ABONNEMENT'
  const jours    = c.prochaineEcheance ? joursAvant(c.prochaineEcheance) : null
  const urgent   = jours !== null && jours >= 0 && jours <= 30
  const depassee = jours !== null && jours < 0
  const montant  = parseFloat(c.montantHT)
  const now      = new Date()

  // Pour les abonnements : répartir les occurrences en passées / futures
  const occPassed = occurrences?.filter(d => d <= now) ?? []
  const occFuture = occurrences?.filter(d => d > now)  ?? []
  const totalPeriode = occurrences ? montant * occurrences.length : null

  return (
    <div className={`${styles.card} ${!isAbo && c.statut === 'PAYE' ? styles.cardPaye : ''}`}
      style={{ '--tc': TYPE_CHARGE_COLORS[c.type] } as React.CSSProperties}>

      <div className={styles.cardStripe} />

      <div className={styles.cardHeader}>
        <span className={styles.typeBadge} style={{ background: TYPE_CHARGE_COLORS[c.type] }}>
          {TYPE_CHARGE_LABELS[c.type]}
        </span>
        {isAbo && c.periodicite && (
          <span className={styles.periodeBadge}>{PERIODICITE_LABELS[c.periodicite]}</span>
        )}
        {!isAbo && c.statut === 'PAYE' && <span className={styles.payeBadge}>✓ Payé</span>}
        {!isAbo && c.statut === 'PREVU' && <span className={styles.prevuBadge}>En attente</span>}
      </div>

      <p className={styles.cardLibelle}>{c.libelle}</p>

      {/* Montant : pour les abonnements filtrés, afficher le total de la période */}
      {totalPeriode !== null ? (
        <div className={styles.cardMontantWrap}>
          <p className={styles.cardMontant}>{fEur(totalPeriode)}</p>
          <p className={styles.cardMontantSub}>{occurrences!.length} × {fEur(montant)}</p>
        </div>
      ) : (
        <p className={styles.cardMontant}>{fEur(montant)}</p>
      )}

      {/* Occurrences détaillées pour les abonnements */}
      {isAbo && occurrences && occurrences.length > 0 && (
        <div className={styles.occurrences}>
          {occPassed.length > 0 && (
            <span className={styles.occPasse}>
              ✓ {occPassed.length} payée{occPassed.length > 1 ? 's' : ''}
              {occPassed.length <= 3 && ` (${occPassed.map(d => fDate(d.toISOString())).join(', ')})`}
            </span>
          )}
          {occFuture.length > 0 && (
            <span className={styles.occFuture}>
              ⏳ {occFuture.length} prévue{occFuture.length > 1 ? 's' : ''}
              {occFuture.length <= 2 && ` (${occFuture.map(d => fDate(d.toISOString())).join(', ')})`}
            </span>
          )}
        </div>
      )}

      <div className={styles.cardMeta}>
        {isAbo ? (
          <>
            <span className={styles.cardMetaItem}>Depuis {fDate(c.dateEffet)}</span>
            {!occurrences && c.prochaineEcheance && (
              <span className={`${styles.echeance} ${urgent ? styles.echeanceUrgent : ''} ${depassee ? styles.echeanceDepassee : ''}`}>
                {depassee ? '•s•️ …' : urgent ? `⏰ J-${jours} · ${fDate(c.prochaineEcheance)}` : `•Y". ${fDate(c.prochaineEcheance)}`}
              </span>
            )}
          </>
        ) : (
          <>
            <span className={styles.cardMetaItem}>{fDate(c.dateEffet)}</span>
            {c.datePaiement && c.statut === 'PAYE' && (
              <span className={styles.cardMetaItem}>Payé le {fDate(c.datePaiement)}</span>
            )}
          </>
        )}
      </div>

      {c.notes && <p className={styles.cardNotes}>{c.notes}</p>}

      <div className={styles.cardActions}>
        <button className={styles.editBtn} onClick={onEdit}>Modifier</button>
        <button className={styles.delBtn}  onClick={onDelete}>Supprimer</button>
      </div>
    </div>
  )
}

// •"?•"? Page principale •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
export function ChargesPage() {
  const navigate = useNavigate()
  const { features, upgradeMessage } = usePlanFeatures()

  const { data: charges = [], isLoading } = useCharges()
  const deleteCharge = useDeleteCharge()

  const [preset,     setPreset]     = useState<PresetKey>('year')
  const [customFrom, setCustomFrom] = useState(toLocalISO(startOfYear()))
  const [customTo,   setCustomTo]   = useState(todayISO())
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Charge | null>(null)
  const [filterType, setFilterType] = useState<TypeCharge | 'ALL'>('ALL')

  // •"?•"? Calcul de la période active •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const { fromDate, toDate } = useMemo(() => {
    let from: Date
    let to = endOfToday()
    if (preset === 'custom') {
      from = new Date(customFrom); from.setHours(0, 0, 0, 0)
      to   = new Date(customTo);   to.setHours(23, 59, 59, 999)
    } else if (preset === 'all') {
      from = new Date('2000-01-01')
      to   = new Date('2099-12-31')
    } else {
      from = PRESETS.find(p => p.key === preset)!.getFrom()
    }
    return { fromDate: from, toDate: to }
  }, [preset, customFrom, customTo])

  // •"?•"? Filtrage par période + type •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const chargesFiltrees = useMemo(() => {
    return charges
      .filter(c => filterType === 'ALL' || c.type === filterType)
      .filter(c => preset === 'all' || chargeEstDansPeriode(c, fromDate, toDate))
      .map(c => ({
        ...c,
        _occ: c.type === 'ABONNEMENT' && c.periodicite && preset !== 'all'
          ? occurrencesDansPeriode(new Date(c.dateEffet), c.periodicite, fromDate, toDate)
          : undefined,
      }))
  }, [charges, filterType, fromDate, toDate, preset])

  // •"?•"? Métriques de la période •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
  const metrics = useMemo(() => {
    const now = new Date()
    let totalPaye = 0, totalPrevu = 0

    chargesFiltrees.forEach(c => {
      const montant = parseFloat(c.montantHT)
      if (c.type === 'ABONNEMENT' && c._occ) {
        const passe  = c._occ.filter(d => d <= now).length * montant
        const futur  = c._occ.filter(d => d > now).length  * montant
        totalPaye  += passe
        totalPrevu += futur
      } else if (c.statut === 'PAYE') {
        totalPaye += montant
      } else {
        totalPrevu += montant
      }
    })

    return { totalPaye, totalPrevu, nb: chargesFiltrees.length }
  }, [chargesFiltrees])

  function startEdit(c: Charge) { setEditTarget(c); setShowForm(true) }
  function closeForm()          { setEditTarget(null); setShowForm(false) }

  // Garde plan — APRÈS tous les hooks. Placée avant, elle faisait varier le
  // nombre de hooks entre deux rendus (le plan vaut TRIAL tant que la requête
  // tenant n'a pas répondu) : « Rendered more hooks than during the previous
  // render », donc crash au chargement à froid de la page.
  if (!features.charges) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: 44 }}>🔒</span>
        <p style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.3rem', color: 'var(--ink)', margin: 0 }}>
          Disponible à partir du plan Edition
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', maxWidth: 340, margin: 0, lineHeight: 1.65 }}>
          {upgradeMessage('charges')}
        </p>
        <button onClick={() => navigate(-1)}
          style={{ marginTop: 8, padding: '9px 20px', borderRadius: 10, border: '1.5px solid var(--cream-dark)', background: 'var(--cream)', color: 'var(--text-mid)', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      <button className={styles.backBtn} onClick={() => navigate('/bilan')}>
        <ArrowLeft size={16} /> Bilan
      </button>

      <PageHero
        title="Charges & abonnements"
        subtitle="Dépenses ponctuelles, pertes et abonnements récurrents"
        extra={(
          <>
            {preset === 'custom' && (
              <div className={styles.customDates}>
                <label className={styles.customLabel}>Du</label>
                <DateInput value={customFrom} onChange={setCustomFrom} className={styles.customInput} />
                <label className={styles.customLabel}>au</label>
                <DateInput value={customTo}   onChange={setCustomTo}   className={styles.customInput} />
              </div>
            )}
            {!isLoading && chargesFiltrees.length > 0 && (
              <div className={styles.heroMetrics}>
                <div className={styles.heroMetric}>
                  <span>Décaissé / payé</span>
                  <strong style={{ color: '#f87171' }}>{fEur(metrics.totalPaye)}</strong>
                </div>
                {metrics.totalPrevu > 0 && <>
                  <div className={styles.heroMetricDiv} />
                  <div className={styles.heroMetric}>
                    <span>•? venir / prévu</span>
                    <strong style={{ color: '#fbbf24' }}>{fEur(metrics.totalPrevu)}</strong>
                  </div>
                </>}
                <div className={styles.heroMetricDiv} />
                <div className={styles.heroMetric}>
                  <span>Total</span>
                  <strong>{fEur(metrics.totalPaye + metrics.totalPrevu)}</strong>
                </div>
                <div className={styles.heroMetricDiv} />
                <div className={styles.heroMetric}>
                  <span>{metrics.nb} charge{metrics.nb > 1 ? 's' : ''} sur la période</span>
                </div>
              </div>
            )}
          </>
        )}
      >
        <div className={styles.heroRight}>
          <div className={styles.periodSelector}>
            {PRESETS.map(p => (
              <button key={p.key}
                className={`${styles.periodBtn} ${preset === p.key ? styles.periodBtnActive : ''}`}
                onClick={() => setPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <button className={styles.btnAdd} onClick={() => { setEditTarget(null); setShowForm(v => !v) }}>
            + Ajouter
          </button>
        </div>
      </PageHero>

      <div className={styles.content}>

        {/* •"?•"? FORMULAIRE •"?•"? */}
        {showForm && (
          <div className={styles.formSection}>
            <h2 className={styles.formTitle}>{editTarget ? 'Modifier la charge' : 'Nouvelle charge'}</h2>
            <ChargeForm initial={editTarget} onDone={closeForm} />
          </div>
        )}

        {/* •"?•"? FILTRES TYPE •"?•"? */}
        {charges.length > 0 && (
          <div className={styles.filters}>
            {(['ALL', 'DEPENSE', 'ABONNEMENT', 'PERTE'] as (TypeCharge | 'ALL')[]).map(t => (
              <button key={t}
                className={`${styles.filterBtn} ${filterType === t ? styles.filterActive : ''}`}
                style={filterType === t && t !== 'ALL' ? { background: TYPE_CHARGE_COLORS[t], color: 'white', borderColor: TYPE_CHARGE_COLORS[t] } : {}}
                onClick={() => setFilterType(t)}>
                {t === 'ALL' ? 'Tout' : TYPE_CHARGE_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        {/* •"?•"? GRILLE •"?•"? */}
        {isLoading && (
          <div className={styles.cardGrid}>
            {[1,2,3].map(i => <div key={i} className={styles.skCard} />)}
          </div>
        )}

        {!isLoading && charges.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Aucune charge enregistrée</p>
            <p className={styles.emptySub}>Ajoutez des dépenses, pertes et abonnements pour les voir apparaître dans votre bilan.</p>
            <button className={styles.btnAdd} onClick={() => setShowForm(true)}>+ Ajouter une charge</button>
          </div>
        )}

        {!isLoading && charges.length > 0 && chargesFiltrees.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Aucune charge sur cette période</p>
            <p className={styles.emptySub}>Essayez une période plus large ou "Tout" pour voir toutes vos charges.</p>
          </div>
        )}

        {!isLoading && chargesFiltrees.length > 0 && (
          <div className={styles.cardGrid}>
            {chargesFiltrees.map(c => (
              <ChargeCard key={c.id} charge={c}
                occurrences={c._occ}
                onEdit={()   => startEdit(c)}
                onDelete={() => deleteCharge.mutate(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




