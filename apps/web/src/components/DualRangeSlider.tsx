import styles from './DualRangeSlider.module.css'

interface Props {
  alerte:    number
  tension:   number
  max?:      number
  onChange:  (alerte: number, tension: number) => void
}

export function DualRangeSlider({ alerte, tension, max = 200, onChange }: Props) {
  const safeAlerte  = Math.min(alerte,  tension)
  const safeTension = Math.max(tension, alerte)

  function handleAlerte(v: number) {
    const newAlerte = Math.min(v, safeTension)
    onChange(newAlerte, safeTension)
  }

  function handleTension(v: number) {
    const newTension = Math.max(v, safeAlerte)
    onChange(safeAlerte, newTension)
  }

  function handleAlerteNum(v: number) {
    const clamped = Math.max(0, Math.min(v, max))
    onChange(clamped, Math.max(clamped, safeTension))
  }

  function handleTensionNum(v: number) {
    const clamped = Math.max(0, Math.min(v, max))
    onChange(Math.min(safeAlerte, clamped), clamped)
  }

  // Gradient : rouge [0→alerte], orange [alerte→tension], vert [tension→max]
  const pA = max > 0 ? (safeAlerte  / max) * 100 : 0
  const pT = max > 0 ? (safeTension / max) * 100 : 0
  const gradient = safeAlerte === 0 && safeTension === 0
    ? 'var(--cream-dark)'
    : `linear-gradient(to right,
        #FCA5A5 0%,
        #FCA5A5 ${pA}%,
        #FED7AA ${pA}%,
        #FED7AA ${pT}%,
        #BBF7D0 ${pT}%,
        #BBF7D0 100%)`

  const disabled = safeAlerte === 0 && safeTension === 0

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Seuils de stock</span>
        <div className={styles.badges}>
          {safeTension > 0
            ? <span className={styles.badge + ' ' + styles.badgeTension}>Tension ≤ {safeTension}</span>
            : <span className={styles.badge + ' ' + styles.badgeNone}>Pas de tension</span>
          }
          {safeAlerte > 0
            ? <span className={styles.badge + ' ' + styles.badgeAlerte}>Alerte ≤ {safeAlerte}</span>
            : <span className={styles.badge + ' ' + styles.badgeNone}>Pas d'alerte</span>
          }
        </div>
      </div>

      <div className={styles.trackWrap}>
        <div className={styles.track} style={{ background: gradient }} />
        <input
          type="range" min={0} max={max} value={safeAlerte}
          className={`${styles.thumb} ${styles.thumbAlerte}`}
          onChange={(e) => handleAlerte(Number(e.target.value))}
          style={{ zIndex: safeAlerte >= safeTension ? 4 : 3 }}
        />
        <input
          type="range" min={0} max={max} value={safeTension}
          className={`${styles.thumb} ${styles.thumbTension}`}
          onChange={(e) => handleTension(Number(e.target.value))}
          style={{ zIndex: safeAlerte >= safeTension ? 3 : 4 }}
        />
      </div>

      <div className={styles.inputs}>
        <div className={styles.inputGroup}>
          <span className={`${styles.inputLabel} ${styles.labelAlerte}`}>Alerte (rouge)</span>
          <input
            type="number" min={0} max={max} value={disabled ? '' : safeAlerte}
            placeholder="0 = désactivé"
            className={`${styles.inputNum} ${styles.inputNumAlerte}`}
            onChange={(e) => handleAlerteNum(Number(e.target.value) || 0)}
          />
        </div>
        <div className={styles.inputGroup}>
          <span className={`${styles.inputLabel} ${styles.labelTension}`}>Tension (orange)</span>
          <input
            type="number" min={0} max={max} value={disabled ? '' : safeTension}
            placeholder="0 = désactivé"
            className={`${styles.inputNum} ${styles.inputNumTension}`}
            onChange={(e) => handleTensionNum(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <p className={styles.hint}>0 = pas de seuil. Alerte ≤ Tension.</p>
    </div>
  )
}
