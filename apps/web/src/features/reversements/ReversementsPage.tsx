import { useState } from 'react'
import { DateInput } from '@/components/DateInput'
import { useReversements, useEncaisserReversement, useAnnulerReversement, useAjusterReversement } from './hooks/useReversements'
import type { Reversement, TypePaiementRemise, StatutReversement } from './hooks/useReversements'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHero } from '@/components/PageHero'
import styles from './ReversementsPage.module.css'

type Filtre = 'EN_ATTENTE' | 'ENCAISSE' | 'TOUS'

function fEur(v: string | number) {
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Modale d'encaissement ────────────────────────────────────────────────────

interface ModalEncaisserProps {
  reversement: Reversement
  onClose:     () => void
}

function ModalEncaisser({ reversement, onClose }: ModalEncaisserProps) {
  const [mode,      setMode]      = useState<TypePaiementRemise>('VIREMENT')
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0])
  const encaisser = useEncaisserReversement()

  // Calcul commission si définie
  const montantBrut = Number(reversement.montantTTC)
  const commPct     = reversement.pointDeVente.commissionPourcent ? Number(reversement.pointDeVente.commissionPourcent) : 0
  const commFixe    = reversement.pointDeVente.commissionFixe     ? Number(reversement.pointDeVente.commissionFixe)     : 0
  const commission  = (montantBrut * commPct / 100) + commFixe
  const netPercu    = montantBrut - commission

  async function handleEncaisser() {
    await encaisser.mutateAsync({
      id: reversement.id,
      modePaiement: mode,
      dateEncaissement: date,
      reference: reference || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.modalTopBar} />
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Encaisser le reversement</h3>
            <p className={styles.modalSub}>{reversement.pointDeVente.nom} · {fDate(reversement.dateCloture)}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Récap montant */}
          <div className={styles.montantRecap}>
            <div className={styles.montantRow}>
              <span>Ventes encaissées par le PDV</span>
              <span className={styles.montantVal}>{fEur(reversement.montantTTC)}</span>
            </div>
            {commission > 0 && (
              <>
                <div className={styles.montantRow}>
                  <span>Commission PDV{commPct > 0 ? ` (${commPct} %)` : ''}{commFixe > 0 ? ` + ${fEur(commFixe)}` : ''}</span>
                  <span className={styles.montantCommission}>− {fEur(commission)}</span>
                </div>
                <div className={`${styles.montantRow} ${styles.montantNet}`}>
                  <span>Net à percevoir</span>
                  <span className={styles.montantNetVal}>{fEur(netPercu)}</span>
                </div>
              </>
            )}
          </div>

          {/* Mode de paiement */}
          <div className={styles.field}>
            <label className={styles.label}>Mode de reversement</label>
            <div className={styles.modeRow}>
              {(['VIREMENT', 'CHEQUE'] as TypePaiementRemise[]).map(m => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m === 'VIREMENT' ? '💳 Virement bancaire' : '📋 Chèque'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de réception</label>
            <DateInput value={date} onChange={setDate} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Référence (optionnel)</label>
            <input
              className={styles.input}
              placeholder={mode === 'VIREMENT' ? 'Référence virement, IBAN…' : 'N° de chèque…'}
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Notes (optionnel)</label>
            <textarea className={styles.textarea} rows={2} placeholder="Observations…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button
            className={styles.btnPrimary}
            onClick={handleEncaisser}
            disabled={encaisser.isPending}
          >
            {encaisser.isPending ? 'Enregistrement…' : `✓ Encaissé — ${fEur(commission > 0 ? netPercu : montantBrut)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper : montant net attendu ────────────────────────────────────────────

function calcNet(rev: Reversement): number {
  if (rev.montantAjuste !== null) return Number(rev.montantAjuste)
  const brut    = Number(rev.montantTTC)
  const commPct = rev.pointDeVente.commissionPourcent ? Number(rev.pointDeVente.commissionPourcent) : 0
  const commFix = rev.pointDeVente.commissionFixe     ? Number(rev.pointDeVente.commissionFixe)     : 0
  return brut - (brut * commPct / 100) - commFix
}

// ── Modale d'ajustement ──────────────────────────────────────────────────────

interface ModalAjusterProps { reversement: Reversement; onClose: () => void }

function ModalAjuster({ reversement, onClose }: ModalAjusterProps) {
  const netCalcule = calcNet(reversement)
  const [montant,  setMontant]  = useState(String(Number(reversement.montantAjuste ?? netCalcule).toFixed(2)))
  const [note,     setNote]     = useState(reversement.noteAjustement ?? '')
  const ajuster = useAjusterReversement()

  async function handleSave() {
    const val = parseFloat(montant.replace(',', '.'))
    if (isNaN(val) || !note.trim()) return
    await ajuster.mutateAsync({ id: reversement.id, montantAjuste: val, noteAjustement: note })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.modalTopBar} />
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Ajuster le montant attendu</h3>
            <p className={styles.modalSub}>{reversement.pointDeVente.nom} · {fDate(reversement.dateCloture)}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.montantRecap}>
            <div className={styles.montantRow}>
              <span>Montant brut (ventes enregistrées)</span>
              <span className={styles.montantVal}>{fEur(reversement.montantTTC)}</span>
            </div>
            <div className={styles.montantRow}>
              <span>Net calculé après commission</span>
              <span className={styles.montantVal}>{fEur(netCalcule)}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', margin: '0 0 4px' }}>
            Parfois le montant réel versé diffère : livres remis en rayon, vol, invendus… Entrez le montant que le PDV va effectivement vous verser.
          </p>
          <div className={styles.field}>
            <label className={styles.label}>Montant attendu (€)</label>
            <input className={styles.input} type="text" inputMode="decimal" value={montant} onChange={e => setMontant(e.target.value)} autoFocus />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Raison de l'ajustement <span style={{ color: 'var(--rose)' }}>*</span></label>
            <textarea className={styles.textarea} rows={2} placeholder="Ex : 3 livres remis en rayon, 1 vol constaté…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #B87A30 100%)' }} onClick={handleSave} disabled={!note.trim() || ajuster.isPending}>
            {ajuster.isPending ? '…' : 'Enregistrer l\'ajustement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte reversement ────────────────────────────────────────────────────────

function ReversementCard({ rev, onEncaisser, onAjuster }: {
  rev: Reversement
  onEncaisser: () => void
  onAjuster:   () => void
}) {
  const isAttente  = rev.statut === 'EN_ATTENTE'
  const isEncaisse = rev.statut === 'ENCAISSE'
  const annuler    = useAnnulerReversement()
  const netAttendu = calcNet(rev)
  const estAjuste  = rev.montantAjuste !== null

  return (
    <div className={`${styles.card} ${isAttente ? styles.cardAttente : isEncaisse ? styles.cardEncaisse : styles.cardAnnule}`}>
      <div className={styles.cardStatus}>
        {isAttente  && <><span className={styles.dot} style={{ background: '#f59e0b' }} />En attente</>}
        {isEncaisse && <><span className={styles.dot} style={{ background: '#22c55e' }} />Encaissé</>}
        {rev.statut === 'ANNULE' && <><span className={styles.dot} style={{ background: '#94a3b8' }} />Annulé</>}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardLeft}>
          <h3 className={styles.cardPDV}>{rev.pointDeVente.nom}</h3>
          <p className={styles.cardSession}>
            {rev.session.nom ? `Session « ${rev.session.nom} »` : 'Session du '}
            {fDate(rev.dateCloture)}
          </p>
          <p className={styles.cardMeta}>{rev.nbVentes} vente{rev.nbVentes > 1 ? 's' : ''} · Brut : {fEur(rev.montantTTC)}</p>
          {estAjuste && rev.noteAjustement && (
            <p className={styles.cardAjustNote}>✎ {rev.noteAjustement}</p>
          )}
          {isEncaisse && rev.dateEncaissement && (
            <p className={styles.cardEncaissDate}>
              {rev.modePaiement === 'VIREMENT' ? '💳' : '📋'}{' '}
              Reçu le {fDate(rev.dateEncaissement)}
              {rev.reference && ` · Réf. ${rev.reference}`}
            </p>
          )}
        </div>

        <div className={styles.cardRight}>
          <p className={styles.cardMontant}>{fEur(netAttendu)}</p>
          <p className={styles.cardMontantLabel}>{estAjuste ? 'Ajusté · Net attendu' : 'Net attendu'}</p>
          {isAttente && (
            <div className={styles.cardActions}>
              <button className={styles.btnEncaisser} onClick={onEncaisser}>💰 Encaisser</button>
              <button className={styles.btnAjuster}   onClick={onAjuster}>✎ Ajuster</button>
              <button className={styles.btnAnnuler} onClick={() => { if (confirm('Annuler ce reversement ?')) annuler.mutate(rev.id) }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════

export function ReversementsPage() {
  const [filtre,       setFiltre]       = useState<Filtre>('EN_ATTENTE')
  const [encaisserRev, setEncaisserRev] = useState<Reversement | null>(null)
  const [ajusterRev,   setAjusterRev]  = useState<Reversement | null>(null)

  const statut: StatutReversement | undefined = filtre === 'TOUS' ? undefined : filtre
  const { data: reversements = [], isLoading } = useReversements(statut)

  // Total basé sur le montant NET (après commission / ajustement)
  const totalAttente = reversements
    .filter(r => r.statut === 'EN_ATTENTE')
    .reduce((s, r) => s + calcNet(r), 0)

  return (
    <div className={styles.page}>

      <PageHero
        title="Reversements PDV"
        subtitle="Suivi des encaissements effectués par vos points de vente partenaires"
        extra={(
          <div className={styles.filtres}>
            {([
              { key: 'EN_ATTENTE', label: '⏳ En attente' },
              { key: 'ENCAISSE',   label: '✅ Encaissés' },
              { key: 'TOUS',       label: 'Tous' },
            ] as { key: Filtre; label: string }[]).map(f => (
              <button
                key={f.key}
                className={`${styles.filtreBtn} ${filtre === f.key ? styles.filtreBtnActive : ''}`}
                onClick={() => setFiltre(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      >
        {filtre === 'EN_ATTENTE' && totalAttente > 0 && (
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeLabel}>À recevoir</span>
            <span className={styles.heroBadgeVal}>{fEur(totalAttente)}</span>
          </div>
        )}
      </PageHero>

      {/* ── Contenu ── */}
      <div className={styles.content}>
        {isLoading && (
          <div className={styles.skeletons}>
            {[1, 2, 3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!isLoading && reversements.length === 0 && (
          <EmptyState
            emoji={filtre === 'EN_ATTENTE' ? '🎉' : '📭'}
            title={filtre === 'EN_ATTENTE'
              ? 'Aucun reversement en attente'
              : filtre === 'ENCAISSE'
                ? 'Aucun reversement encaissé'
                : 'Aucun reversement'
            }
            description={filtre === 'EN_ATTENTE'
              ? 'Parfait ! Tous vos reversements sont à jour.'
              : 'Les reversements apparaîtront ici à la fermeture des sessions sur les PDV partenaires.'
            }
          />
        )}

        {!isLoading && reversements.length > 0 && (
          <div className={styles.list}>
            {reversements.map(rev => (
              <ReversementCard
                key={rev.id}
                rev={rev}
                onEncaisser={() => setEncaisserRev(rev)}
                onAjuster={() => setAjusterRev(rev)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modale encaissement ── */}
      {encaisserRev && (
        <ModalEncaisser reversement={encaisserRev} onClose={() => setEncaisserRev(null)} />
      )}
      {ajusterRev && (
        <ModalAjuster reversement={ajusterRev} onClose={() => setAjusterRev(null)} />
      )}
    </div>
  )
}
