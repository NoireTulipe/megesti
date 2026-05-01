import styles from './SimpleEntityCard.module.css'

interface Props {
  nom:      string
  icon?:    string
  lines?:   string[]
  onEdit?:  () => void
  color?:   'rose' | 'sage' | 'gold' | 'mauve' | 'ink'
  centered?: boolean
}

const COLOR_MAP = {
  rose:  { bg: 'linear-gradient(135deg, #F9EDE8 0%, #F0D8D0 100%)', border: 'rgba(196,144,124,0.25)' },
  sage:  { bg: 'linear-gradient(135deg, #EDF4EE 0%, #D8EAD9 100%)', border: 'rgba(107,143,113,0.25)' },
  gold:  { bg: 'linear-gradient(135deg, #FBF5E6 0%, #F0E4C0 100%)', border: 'rgba(201,147,58,0.25)' },
  mauve: { bg: 'linear-gradient(135deg, #F3F0F9 0%, #E4DFF0 100%)', border: 'rgba(139,123,171,0.25)' },
  ink:   { bg: 'linear-gradient(135deg, #EDF1F7 0%, #D8E2F0 100%)', border: 'rgba(36,51,71,0.15)' },
}

export function SimpleEntityCard({ nom, icon = '✦', lines = [], onEdit, color = 'rose', centered = false }: Props) {
  const c = COLOR_MAP[color]

  return (
    <article className={`${styles.card}${centered ? ` ${styles.cardCentered}` : ''}`} onClick={onEdit}>
      {/* Icône */}
      <div className={styles.iconWrap} style={{ background: c.bg, borderColor: c.border }}>
        <span className={styles.icon}>{icon}</span>
      </div>

      {/* Contenu */}
      <div className={styles.body}>
        <h3 className={styles.nom}>{nom}</h3>
        <div className={styles.lines}>
          {lines.filter(Boolean).map((l, i) => (
            <span key={i} className={styles.line}>{l}</span>
          ))}
        </div>
      </div>

      {/* Bouton modifier */}
      {onEdit && (
        <button
          className={styles.editBtn}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          aria-label="Modifier"
        >
          <span>Modifier</span>
        </button>
      )}

      {/* Coin décoratif */}
      <div className={styles.corner} aria-hidden="true" />
    </article>
  )
}
