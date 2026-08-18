import { useState, useMemo } from 'react'
import { DateInput } from '@/components/DateInput'
import { useVentesHorsSession } from './hooks/useVentes'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import { addMonthsISO, addYearsISO, todayISO } from '@/lib/date'
import styles from './VentesPage.module.css'

type Periode = '1m' | '3m' | '1a' | 'perso'

function startOf(p: Periode, customFrom: string): string {
  if (p === '1m') return addMonthsISO(-1)
  if (p === '3m') return addMonthsISO(-3)
  if (p === '1a') return addYearsISO(-1)
  return customFrom
}

function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const MODE_LABEL: Record<string, string> = {
  CB: 'CB', ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', SUMUP: 'SumUp',
}

export function HistoriqueHorsSession() {
  const franchiseTVA = useFranchiseTVA()
  const today = todayISO()
  const [periode,    setPeriode]    = useState<Periode>('3m')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo,   setCustomTo]   = useState(today)
  const [motifFilter, setMotifFilter] = useState<string | null>(null)

  const from = startOf(periode, customFrom)
  const to   = periode === 'perso' ? customTo : today

  const { data: ventes = [], isLoading } = useVentesHorsSession(from, to)

  const validees = ventes.filter(v => v.statut === 'VALIDEE')

  // Stats globales
  const totalTTC = validees.reduce((s, v) => s + parseFloat(v.totalTTC), 0)
  const totalHT  = validees.reduce((s, v) => s + parseFloat(v.totalHT),  0)

  // Groupage par motif
  const parMotif = useMemo(() => {
    const map = new Map<string, { libelle: string; ca: number; nb: number }>()
    for (const v of validees) {
      if (!v.motifVente) continue
      const k = v.motifVente.id
      const ex = map.get(k) ?? { libelle: v.motifVente.libelle, ca: 0, nb: 0 }
      map.set(k, { ...ex, ca: ex.ca + parseFloat(v.totalTTC), nb: ex.nb + 1 })
    }
    return [...map.entries()].sort((a, b) => b[1].ca - a[1].ca)
  }, [validees])

  const filtered = motifFilter
    ? validees.filter(v => v.motifVente?.id === motifFilter)
    : validees

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
            <DateInput value={customFrom} onChange={setCustomFrom} className={styles.customInput} />
            <span>→</span>
            <DateInput value={customTo}   onChange={setCustomTo}   className={styles.customInput} />
          </div>
        )}
      </div>

      {isLoading && <p className={styles.loadingText}>Chargement…</p>}

      {!isLoading && validees.length > 0 && (
        <>
          {/* Stats */}
          <div className={styles.horsSessionStats}>
            <div className={styles.horsSessionStat}>
              <span>{validees.length} vente{validees.length > 1 ? 's' : ''}</span>
            </div>
            <div className={styles.horsSessionStat}>
              <strong>{fEur(totalTTC)}</strong>
              <span>CA TTC</span>
            </div>
            {!franchiseTVA && (
              <div className={styles.horsSessionStat}>
                <strong>{fEur(totalHT)}</strong>
                <span>CA HT</span>
              </div>
            )}
          </div>

          {/* Filtre motif */}
          {parMotif.length > 1 && (
            <div className={styles.historiquePeriodeBar}>
              <button className={`${styles.periodBtn} ${!motifFilter ? styles.periodBtnActive : ''}`}
                onClick={() => setMotifFilter(null)}>Tous</button>
              {parMotif.map(([id, { libelle, ca, nb }]) => (
                <button key={id}
                  className={`${styles.periodBtn} ${motifFilter === id ? styles.periodBtnActive : ''}`}
                  onClick={() => setMotifFilter(id)}>
                  {libelle} · {nb} · {fEur(ca)}
                </button>
              ))}
            </div>
          )}

          {/* Liste */}
          <div className={styles.historiqueList}>
            {filtered.map(v => (
              <div key={v.id} className={styles.historiqueCard}>
                <div className={styles.historiqueCardLeft}>
                  <span className={styles.historiqueCardPDV}>{v.motifVente?.libelle}</span>
                  <span className={styles.historiqueCardDates}>{fDate(v.dateVente)}</span>
                  <span className={styles.historiqueCardNom}>
                    {v.lignes.map(l => `${l.article.nom} ×${l.quantite}`).join(' · ')}
                  </span>
                </div>
                <div className={styles.historiqueCardRight}>
                  <span className={styles.historiqueCardVentes}>{MODE_LABEL[v.modePaiement] ?? v.modePaiement}</span>
                  <strong className={styles.historiqueCardAmount}>{fEur(parseFloat(v.totalTTC))}</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isLoading && validees.length === 0 && (
        <p className={styles.emptyHisto}>Aucune vente hors session sur cette période.</p>
      )}
    </div>
  )
}
