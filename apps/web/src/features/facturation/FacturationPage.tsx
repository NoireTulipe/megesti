import { generateUUID } from '@/lib/utils'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHero } from '@/components/PageHero'
import {
  useQuota, useEmissions, useReceptions, useMarquerLu,
  useCreateEmission, useProchainNumero,
  type StatutEmission, type LigneEmission,
} from './hooks/useFacturation'
import { QuotaDepaseModal } from './QuotaDepaseModal'
import styles from './FacturationPage.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fEur(v: string | number) {
  return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUT_META: Record<StatutEmission, { label: string; color: string; bg: string }> = {
  BROUILLON: { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6' },
  ENVOYEE:   { label: 'Envoyée',   color: '#2563EB', bg: '#EFF6FF' },
  ACCEPTEE:  { label: 'Acceptée',  color: '#15803D', bg: '#F0FDF4' },
  REFUSEE:   { label: 'Refusée',   color: '#B91C1C', bg: '#FEF2F2' },
  ANNULEE:   { label: 'Annulée',   color: '#6B7280', bg: '#F3F4F6' },
}

const TVA_OPTIONS = [0, 5.5, 10, 20]

type Tab = 'overview' | 'emettre' | 'emissions' | 'receptions'

// ── Jauge quota ────────────────────────────────────────────────────────────────

function QuotaGauge({ restant, quotaMois, credits }: { restant: number; quotaMois: number; credits: number }) {
  const total = quotaMois + credits
  const used  = total - restant
  const pct   = total > 0 ? Math.min(used / total, 1) : 0
  const color = restant === 0 ? '#B91C1C' : restant <= 3 ? '#D97706' : '#15803D'

  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeBar}>
        <div className={styles.gaugeFill} style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <div className={styles.gaugeLabels}>
        <span style={{ color }}>{restant} facture{restant !== 1 ? 's' : ''} restante{restant !== 1 ? 's' : ''}</span>
        <span className={styles.gaugeTotal}>
          {used} / {total} utilisée{used !== 1 ? 's' : ''}
          {credits > 0 && <span className={styles.creditsBadge}>+{credits} crédit{credits > 1 ? 's' : ''}</span>}
        </span>
      </div>
    </div>
  )
}

// ── Formulaire d'émission ──────────────────────────────────────────────────────

function EmissionForm({ onSent }: { onSent: () => void }) {
  const { data: nextNum } = useProchainNumero()
  const create = useCreateEmission()

  const [numero,     setNumero]     = useState('')
  const [dateEm,     setDateEm]     = useState(new Date().toISOString().slice(0, 10))
  const [dateEch,    setDateEch]    = useState('')
  const [destSiret,  setDestSiret]  = useState('')
  const [destNom,    setDestNom]    = useState('')
  const [lignes,     setLignes]     = useState<LigneEmission[]>([
    { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 },
  ])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (nextNum?.numero && !numero) setNumero(nextNum.numero)
  }, [nextNum])

  const totaux = useMemo(() => {
    let ht = 0, tva = 0
    for (const l of lignes) {
      const lht = l.prixUnitaireHT * l.quantite
      ht  += lht
      tva += lht * l.tauxTVA / 100
    }
    return { ht: Math.round(ht * 100) / 100, tva: Math.round(tva * 100) / 100, ttc: Math.round((ht + tva) * 100) / 100 }
  }, [lignes])

  function addLigne() {
    setLignes(prev => [...prev, { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 }])
  }
  function removeLigne(i: number) {
    setLignes(prev => prev.filter((_, j) => j !== i))
  }
  function updateLigne<K extends keyof LigneEmission>(i: number, key: K, val: LigneEmission[K]) {
    setLignes(prev => prev.map((l, j) => j === i ? { ...l, [key]: val } : l))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (lignes.some(l => !l.description.trim())) {
      setError('Chaque ligne doit avoir une description.'); return
    }
    try {
      await create.mutateAsync({
        id: generateUUID(), numero, dateEmission: `${dateEm}T00:00:00.000Z`,
        dateEcheance:        dateEch ? `${dateEch}T00:00:00.000Z` : null,
        destinataireSiret:   destSiret || null,
        destinataireNom:     destNom   || null,
        lignes,
      })
      onSent()
    } catch (err: any) {
      if (err?.status === 402) {
        setError('QUOTA')
      } else {
        setError(err?.message ?? 'Erreur lors de l\'envoi.')
      }
    }
  }

  if (error === 'QUOTA') return <QuotaDepaseModal onClose={() => setError(null)} />

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Entête */}
      <div className={styles.formGrid2}>
        <div className={styles.field}>
          <label className={styles.label}>Numéro <span className={styles.req}>*</span></label>
          <input className={styles.input} value={numero} onChange={e => setNumero(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date d'émission <span className={styles.req}>*</span></label>
          <input className={styles.input} type="date" value={dateEm} onChange={e => setDateEm(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>SIRET destinataire</label>
          <input className={styles.input} value={destSiret} onChange={e => setDestSiret(e.target.value)} placeholder="12345678900014" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Nom destinataire</label>
          <input className={styles.input} value={destNom} onChange={e => setDestNom(e.target.value)} placeholder="Société XYZ" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date d'échéance</label>
          <input className={styles.input} type="date" value={dateEch} onChange={e => setDateEch(e.target.value)} />
        </div>
      </div>

      {/* Lignes */}
      <div className={styles.lignesSection}>
        <div className={styles.lignesHeader}>
          <span className={styles.sectionLabel}>Lignes de facture</span>
          <button type="button" className={styles.btnAddLigne} onClick={addLigne}>+ Ajouter une ligne</button>
        </div>

        <div className={styles.lignesHead}>
          <span style={{ flex: 3 }}>Description</span>
          <span style={{ width: 70, textAlign: 'right' }}>Qté</span>
          <span style={{ width: 110, textAlign: 'right' }}>Prix HT/u.</span>
          <span style={{ width: 80, textAlign: 'right' }}>TVA %</span>
          <span style={{ width: 100, textAlign: 'right' }}>Total HT</span>
          <span style={{ width: 32 }} />
        </div>

        {lignes.map((l, i) => (
          <div key={i} className={styles.ligneRow}>
            <input
              className={`${styles.input} ${styles.ligneDesc}`}
              style={{ flex: 3 }}
              placeholder="Prestation / article…"
              value={l.description}
              onChange={e => updateLigne(i, 'description', e.target.value)}
              required
            />
            <input className={`${styles.input} ${styles.ligneNum}`}
              type="number" min="0.01" step="0.01" value={l.quantite}
              onChange={e => updateLigne(i, 'quantite', Number(e.target.value))} />
            <input className={`${styles.input} ${styles.ligneNum}`}
              type="number" min="0" step="0.01" value={l.prixUnitaireHT}
              onChange={e => updateLigne(i, 'prixUnitaireHT', Number(e.target.value))} />
            <select className={`${styles.input} ${styles.ligneNum}`}
              value={l.tauxTVA} onChange={e => updateLigne(i, 'tauxTVA', Number(e.target.value))}>
              {TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
            </select>
            <span className={styles.ligneTotal}>{fEur(l.prixUnitaireHT * l.quantite)}</span>
            {lignes.length > 1 && (
              <button type="button" className={styles.btnRemoveLigne} onClick={() => removeLigne(i)}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Totaux */}
      <div className={styles.totauxBlock}>
        <div className={styles.totauxRow}><span>Total HT</span><span>{fEur(totaux.ht)}</span></div>
        <div className={styles.totauxRow}><span>TVA</span><span>{fEur(totaux.tva)}</span></div>
        <div className={`${styles.totauxRow} ${styles.totauxRowBig}`}><span>Total TTC</span><span>{fEur(totaux.ttc)}</span></div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary} disabled={create.isPending}>
          {create.isPending ? 'Envoi en cours…' : 'Émettre la facture'}
        </button>
      </div>
    </form>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export function FacturationPage() {
  const [tab, setTab]                   = useState<Tab>('overview')
  const [showQuotaModal, setQuotaModal] = useState(false)
  const [searchParams]                  = useSearchParams()

  const { data: quota }      = useQuota()
  const { data: emissions  } = useEmissions()
  const { data: receptions } = useReceptions()
  const marquerLu            = useMarquerLu()

  // Rechargement OK → retour sur overview avec confirmation
  useEffect(() => {
    if (searchParams.get('rechargement') === 'ok') setTab('overview')
  }, [searchParams])

  const nonLus = receptions?.filter(r => !r.lu).length ?? 0

  return (
    <div className={styles.page}>
      <PageHero
        title="Facturation électronique"
        subtitle={quota ? `${quota.restant} facture${quota.restant !== 1 ? 's' : ''} restante${quota.restant !== 1 ? 's' : ''} ce mois` : ''}
      >
        {quota && quota.restant <= 3 && (
          <button className={styles.btnRecharger} onClick={() => setQuotaModal(true)}>
            {quota.restant === 0 ? '⚠ Recharger le facturier' : '+ Recharger'}
          </button>
        )}
      </PageHero>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          ['overview',   'Vue d\'ensemble'],
          ['emettre',    'Émettre une facture'],
          ['emissions',  'Émissions'],
          ['receptions', `Réceptions${nonLus > 0 ? ` (${nonLus})` : ''}`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vue d'ensemble */}
      {tab === 'overview' && (
        <div className={styles.overview}>
          {quota && (
            <div className={styles.overviewCard}>
              <h3 className={styles.overviewCardTitle}>Quota mensuel</h3>
              <QuotaGauge restant={quota.restant} quotaMois={quota.quotaMois} credits={quota.creditsSupp} />
              {quota.restant === 0 && (
                <button className={styles.btnPrimary} style={{ marginTop: 16, alignSelf: 'flex-start' }}
                  onClick={() => setQuotaModal(true)}>
                  Recharger le facturier
                </button>
              )}
            </div>
          )}

          <div className={styles.overviewGrid}>
            <div className={styles.statCard}>
              <span className={styles.statVal}>{emissions?.filter(e => e.statut === 'ENVOYEE' || e.statut === 'ACCEPTEE').length ?? 0}</span>
              <span className={styles.statLabel}>Factures émises ce mois</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statVal}>{receptions?.length ?? 0}</span>
              <span className={styles.statLabel}>Factures reçues</span>
            </div>
            <div className={styles.statCard} style={{ borderColor: nonLus > 0 ? '#FECACA' : undefined }}>
              <span className={styles.statVal} style={{ color: nonLus > 0 ? '#B91C1C' : undefined }}>{nonLus}</span>
              <span className={styles.statLabel}>Non lues</span>
            </div>
          </div>

          {searchParams.get('rechargement') === 'ok' && (
            <div className={styles.successBanner}>
              Rechargement effectué — vos crédits sont disponibles immédiatement.
            </div>
          )}
        </div>
      )}

      {/* Émettre */}
      {tab === 'emettre' && (
        <div className={styles.emettreWrap}>
          <EmissionForm onSent={() => setTab('emissions')} />
        </div>
      )}

      {/* Émissions */}
      {tab === 'emissions' && (
        <div className={styles.listWrap}>
          {!emissions?.length && (
            <p className={styles.empty}>Aucune facture émise pour l'instant.</p>
          )}
          {emissions?.map(f => {
            const meta = STATUT_META[f.statut]
            return (
              <div key={f.id} className={styles.factureRow}>
                <div className={styles.factureLeft}>
                  <span className={styles.factureNum}>{f.numero}</span>
                  <span className={styles.factureDest}>{f.destinataireNom ?? '—'}</span>
                  {f.destinataireSiret && <span className={styles.factureSiret}>{f.destinataireSiret}</span>}
                </div>
                <div className={styles.factureRight}>
                  <span className={styles.factureDate}>{fDate(f.dateEmission)}</span>
                  <span className={styles.factureMontant}>{fEur(f.montantTTC)}</span>
                  <span className={styles.statutBadge} style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Réceptions */}
      {tab === 'receptions' && (
        <div className={styles.listWrap}>
          {!receptions?.length && (
            <p className={styles.empty}>Aucune facture reçue pour l'instant.</p>
          )}
          {receptions?.map(f => (
            <div key={f.id} className={`${styles.factureRow} ${!f.lu ? styles.factureRowUnread : ''}`}
              onClick={() => !f.lu && marquerLu.mutate(f.id)}>
              <div className={styles.factureLeft}>
                {!f.lu && <span className={styles.unreadDot} />}
                <div>
                  <span className={styles.factureDest}>{f.emetteurNom ?? 'Émetteur inconnu'}</span>
                  {f.emetteurSiret && <span className={styles.factureSiret}>{f.emetteurSiret}</span>}
                </div>
              </div>
              <div className={styles.factureRight}>
                <span className={styles.factureDate}>{fDate(f.dateReception)}</span>
                <span className={styles.factureMontant}>{fEur(f.montantTTC)}</span>
                <span className={styles.statutBadge} style={{ color: '#15803D', background: '#F0FDF4' }}>
                  Reçue
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showQuotaModal && <QuotaDepaseModal onClose={() => setQuotaModal(false)} />}
    </div>
  )
}
