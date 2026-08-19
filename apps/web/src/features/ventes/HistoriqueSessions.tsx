import { useState, useMemo } from 'react'
import { Overlay } from '@/components/ui/Overlay'
import { DateInput } from '@/components/DateInput'
import { useHistoriqueSessions, useReopenSessionCaisse } from './hooks/useSessionsCaisse'
import { BilanSession } from './BilanSession'
import { addMonthsISO, addYearsISO, todayISO } from '@/lib/date'
import styles from './VentesPage.module.css'

type Periode = '1m' | '3m' | '1a' | 'perso'

function startOf(p: Periode, customFrom: string): string {
  if (p === '1m') return addMonthsISO(-1)
  if (p === '3m') return addMonthsISO(-3)
  if (p === '1a') return addYearsISO(-1)
  return customFrom
}

function fDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fEur(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function HistoriqueSessions() {
  const today = todayISO()
  const [periode,       setPeriode]       = useState<Periode>('3m')
  const [customFrom,    setCustomFrom]    = useState(today)
  const [customTo,      setCustomTo]      = useState(today)
  const [bilanSession,  setBilanSession]  = useState<string | null>(null)
  const [reopenConfirm, setReopenConfirm] = useState<string | null>(null)

  const from = startOf(periode, customFrom)
  const to   = periode === 'perso' ? customTo : today

  const { data: sessions = [], isLoading } = useHistoriqueSessions(from, to)
  const reopen = useReopenSessionCaisse()

  const bilanSessionObj = useMemo(
    () => sessions.find(s => s.id === bilanSession) ?? null,
    [sessions, bilanSession]
  )

  async function handleReopen(id: string) {
    await reopen.mutateAsync(id)
    setReopenConfirm(null)
  }

  return (
    <div className={styles.historiqueSection}>

      {/* ── Sélecteur de période ── */}
      <div className={styles.historiquePeriodeBar}>
        {(['1m', '3m', '1a', 'perso'] as Periode[]).map((k) => (
          <button key={k}
            className={`${styles.periodBtn} ${periode === k ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriode(k)}>
            {{ '1m': '1 mois', '3m': '3 mois', '1a': '1 an', perso: 'Personnalisé' }[k]}
          </button>
        ))}
        {periode === 'perso' && (
          <div className={styles.customDatesInline}>
            <DateInput value={customFrom} onChange={setCustomFrom} className={styles.customInput} />
            <span>→</span>
            <DateInput value={customTo}   onChange={setCustomTo}   className={styles.customInput} />
          </div>
        )}
      </div>

      {isLoading && <p className={styles.loadingText}>Chargement…</p>}
      {!isLoading && sessions.length === 0 && (
        <p className={styles.emptyHisto}>Aucune session fermée sur cette période.</p>
      )}

      {/* ── Liste des sessions fermées ── */}
      {sessions.length > 0 && (
        <div className={styles.historiqueList}>
          {sessions.map(s => {
            const ventes = s._count?.ventes ?? 0
            const ca     = s._caSession ?? 0
            return (
              <div key={s.id} className={styles.historiqueCard}>
                <div className={styles.historiqueCardLeft}>
                  <span className={styles.historiqueCardPDV}>{s.pointDeVente.nom}</span>
                  {s.nom && <span className={styles.historiqueCardNom}>{s.nom}</span>}
                  <span className={styles.historiqueCardDates}>
                    {fDate(s.dateOuverture)} → {fDate(s.dateFermeture)}
                  </span>
                  <span className={styles.historiqueCardVentes}>{ventes} vente{ventes > 1 ? 's' : ''}</span>
                </div>

                <div className={styles.historiqueCardRight}>
                  <span className={styles.historiqueCardAmount}>{fEur(ca)}</span>
                  <span className={styles.historiqueCardVentes}>CA TTC</span>
                </div>

                <div className={styles.historiqueCardActions}>
                  {/* ── Bouton Rouvrir ── */}
                  {reopenConfirm === s.id ? (
                    <div className={styles.reopenConfirm}>
                      <span className={styles.reopenConfirmTxt}>Rouvrir cette session ?</span>
                      <button className={styles.reopenConfirmYes}
                        onClick={() => handleReopen(s.id)}
                        disabled={reopen.isPending}>
                        {reopen.isPending ? '…' : 'Oui'}
                      </button>
                      <button className={styles.reopenConfirmNo} onClick={() => setReopenConfirm(null)}>
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button className={styles.reopenBtn} onClick={() => setReopenConfirm(s.id)} title="Rouvrir cette session fermée par erreur">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      Rouvrir
                    </button>
                  )}

                  {/* ── Bouton Bilan ── */}
                  <button className={styles.bilanBtn} onClick={() => setBilanSession(s.id)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Voir le bilan
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bilan en modale (même style que la session active) ── */}
      {bilanSessionObj && (
        <Overlay className={styles.bilanOverlay} onClose={() => setBilanSession(null)}>
          <div className={styles.bilanPanel} onClick={e => e.stopPropagation()}>
            <BilanSession
              sessionId={bilanSessionObj.id}
              pdvNom={bilanSessionObj.pointDeVente.nom}
              sessionNom={bilanSessionObj.nom ?? undefined}
              commissionFixe={bilanSessionObj.pointDeVente.commissionFixe}
              commissionPourcent={bilanSessionObj.pointDeVente.commissionPourcent}
              onClose={() => setBilanSession(null)}
            />
          </div>
        </Overlay>
      )}
    </div>
  )
}
