import { useState, useMemo } from 'react'
import { useHistoriqueSessions } from './hooks/useSessionsCaisse'
import { BilanSession } from './BilanSession'
import styles from './VentesPage.module.css'

type Periode = '1m' | '3m' | '1a' | 'perso'

function startOf(p: Periode, customFrom: string): string {
  const d = new Date()
  if (p === '1m') { d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10) }
  if (p === '3m') { d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10) }
  if (p === '1a') { d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }
  return customFrom
}

function fDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function HistoriqueSessions() {
  const today = new Date().toISOString().slice(0, 10)
  const [periode,     setPeriode]     = useState<Periode>('3m')
  const [customFrom,  setCustomFrom]  = useState(today)
  const [customTo,    setCustomTo]    = useState(today)
  const [bilanSession, setBilanSession] = useState<string | null>(null)

  const from = startOf(periode, customFrom)
  const to   = periode === 'perso' ? customTo : today

  const { data: sessions = [], isLoading } = useHistoriqueSessions(from, to)

  const bilanSessionObj = useMemo(
    () => sessions.find(s => s.id === bilanSession) ?? null,
    [sessions, bilanSession]
  )

  return (
    <div className={styles.historiqueSection}>
      <div className={styles.historiquePeriodeBar}>
        {([['1m', '1 mois'], ['3m', '3 mois'], ['1a', '1 an'], ['perso', 'Personnalisé']] as [Periode, string][]).map(([k, l]) => (
          <button key={k}
            className={`${styles.periodBtn} ${periode === k ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriode(k)}>{l}</button>
        ))}
        {periode === 'perso' && (
          <div className={styles.customDatesInline}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={styles.customInput} />
            <span>→</span>
            <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className={styles.customInput} />
          </div>
        )}
      </div>

      {isLoading && <p className={styles.loadingText}>Chargement…</p>}
      {!isLoading && sessions.length === 0 && (
        <p className={styles.emptyHisto}>Aucune session fermée sur cette période.</p>
      )}

      {sessions.length > 0 && (
        <div className={styles.historiqueList}>
          {sessions.map(s => {
            const ventes  = s._count?.ventes ?? 0
            return (
              <div key={s.id} className={styles.historiqueCard}
                onClick={() => setBilanSession(s.id)}>
                <div className={styles.historiqueCardLeft}>
                  <span className={styles.historiqueCardPDV}>{s.pointDeVente.nom}</span>
                  {s.nom && <span className={styles.historiqueCardNom}>{s.nom}</span>}
                  <span className={styles.historiqueCardDates}>
                    {fDate(s.dateOuverture)} → {fDate(s.dateFermeture)}
                  </span>
                </div>
                <div className={styles.historiqueCardRight}>
                  <span className={styles.historiqueCardVentes}>{ventes} vente{ventes > 1 ? 's' : ''}</span>
                  <span className={styles.historiqueCardAction}>Voir bilan →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bilanSessionObj && (
        <BilanSession
          sessionId={bilanSessionObj.id}
          pdvNom={bilanSessionObj.pointDeVente.nom}
          sessionNom={bilanSessionObj.nom ?? undefined}
          onClose={() => setBilanSession(null)}
        />
      )}
    </div>
  )
}
