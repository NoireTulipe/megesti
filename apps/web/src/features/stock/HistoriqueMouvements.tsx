import { useState, useMemo } from 'react'
import { useMouvements, MVT_LABELS, MVT_EMOJI, type MvtPeriod, type MouvementStock } from './hooks/useMouvementsStock'
import styles from './HistoriqueMouvements.module.css'

const PERIODS: { key: MvtPeriod; label: string }[] = [
  { key: '7d',  label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '3m',  label: '3 mois' },
  { key: '12m', label: '1 an' },
]

function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface SyntheseProps { mvts: MouvementStock[] }

function Synthese({ mvts }: SyntheseProps) {
  const totalEntrees = mvts.filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0)
  const totalSorties = mvts.filter(m => m.delta < 0).reduce((s, m) => s + Math.abs(m.delta), 0)

  return (
    <div className={styles.synthese}>
      <div className={styles.syntheseCard} style={{ borderColor: '#22c55e', background: '#f0fdf4' }}>
        <span className={styles.syntheseEmoji}>📥</span>
        <div>
          <p className={styles.syntheseVal} style={{ color: '#15803d' }}>+{totalEntrees}</p>
          <p className={styles.syntheseLabel}>unités reçues</p>
        </div>
      </div>
      <div className={styles.syntheseCard} style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
        <span className={styles.syntheseEmoji}>📤</span>
        <div>
          <p className={styles.syntheseVal} style={{ color: '#dc2626' }}>−{totalSorties}</p>
          <p className={styles.syntheseLabel}>unités sorties</p>
        </div>
      </div>
      <div className={styles.syntheseCard} style={{ borderColor: 'var(--cream-dark)', background: 'var(--cream)' }}>
        <span className={styles.syntheseEmoji}>⚖️</span>
        <div>
          <p className={styles.syntheseVal} style={{ color: 'var(--ink)' }}>
            {totalEntrees - totalSorties >= 0 ? '+' : ''}{totalEntrees - totalSorties}
          </p>
          <p className={styles.syntheseLabel}>bilan net</p>
        </div>
      </div>
      <div className={styles.syntheseCard} style={{ borderColor: 'var(--cream-dark)', background: 'var(--cream)' }}>
        <span className={styles.syntheseEmoji}>🔄</span>
        <div>
          <p className={styles.syntheseVal} style={{ color: 'var(--ink)' }}>{mvts.length}</p>
          <p className={styles.syntheseLabel}>mouvement{mvts.length > 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
}

interface TimelineProps { mvts: MouvementStock[] }

function Timeline({ mvts }: TimelineProps) {
  if (mvts.length === 0) return (
    <div className={styles.empty}>
      <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
      <p>Aucun mouvement sur cette période.</p>
    </div>
  )

  return (
    <div className={styles.timeline}>
      {mvts.map(m => {
        const isEntree = m.delta > 0
        return (
          <div key={m.id} className={styles.mvtRow}>
            <div className={styles.timelineLine}>
              <div className={styles.timelineDot} style={{ background: isEntree ? '#22c55e' : '#ef4444' }} />
            </div>
            <div className={styles.mvtCard}>
              <div className={styles.mvtTop}>
                <div className={styles.mvtLeft}>
                  <span className={styles.mvtEmoji}>{MVT_EMOJI[m.type]}</span>
                  <div>
                    <p className={styles.mvtArticle}>{m.article.nom}</p>
                    <p className={styles.mvtMeta}>
                      <span className={styles.mvtRayon}>{m.article.rayon.nom}</span>
                      <span className={styles.mvtType}>{MVT_LABELS[m.type]}</span>
                      {m.motif && <span className={styles.mvtMotif}>— {m.motif}</span>}
                    </p>
                  </div>
                </div>
                <div className={styles.mvtRight}>
                  <span className={styles.mvtDelta} style={{ color: isEntree ? '#15803d' : '#dc2626' }}>
                    {isEntree ? '+' : ''}{m.delta}
                  </span>
                  <span className={styles.mvtStock}>{m.stockAvant} → {m.stockApres}</span>
                </div>
              </div>
              <p className={styles.mvtDate}>{fDate(m.createdAt)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function HistoriqueMouvements() {
  const [period,    setPeriod]    = useState<MvtPeriod>('30d')
  const [rayonId,   setRayonId]   = useState<string>('all')

  const { data: mvts = [], isLoading } = useMouvements(period)

  // Rayons uniques présents dans les mouvements
  const rayons = useMemo(() => {
    const map = new Map<string, string>()
    mvts.forEach(m => map.set(m.article.rayon.id, m.article.rayon.nom))
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [mvts])

  // Filtrage par rayon
  const filtered = useMemo(() =>
    rayonId === 'all' ? mvts : mvts.filter(m => m.article.rayon.id === rayonId)
  , [mvts, rayonId])

  return (
    <div className={styles.wrap}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Historique des mouvements</h2>
          <p className={styles.subtitle}>
            {filtered.length} mouvement{filtered.length > 1 ? 's' : ''}
            {rayonId !== 'all' && rayons.find(r => r.id === rayonId)
              ? ` · ${rayons.find(r => r.id === rayonId)!.nom}`
              : ''}
          </p>
        </div>
        {/* Sélecteur de période */}
        <div className={styles.periodSelector}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`${styles.periodBtn} ${period === p.key ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtre par rayon — affiché seulement si plusieurs rayons */}
      {!isLoading && rayons.length > 1 && (
        <div className={styles.rayonBar}>
          <button
            className={`${styles.rayonPill} ${rayonId === 'all' ? styles.rayonPillActive : ''}`}
            onClick={() => setRayonId('all')}
          >
            Tous les rayons
          </button>
          {rayons.map(r => (
            <button
              key={r.id}
              className={`${styles.rayonPill} ${rayonId === r.id ? styles.rayonPillActive : ''}`}
              onClick={() => setRayonId(prev => prev === r.id ? 'all' : r.id)}
            >
              {r.nom}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {!isLoading && filtered.length > 0 && <Synthese mvts={filtered} />}

      {!isLoading && <Timeline mvts={filtered} />}
    </div>
  )
}
