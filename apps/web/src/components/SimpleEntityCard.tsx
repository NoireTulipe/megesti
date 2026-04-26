import styles from './SimpleEntityCard.module.css'

interface Props {
  nom:     string
  icon?:   string
  lines?:  string[]
  onEdit?: () => void
}

export function SimpleEntityCard({ nom, icon = '📋', lines = [], onEdit }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.body}>
        <h3 className={styles.nom}>{nom}</h3>
        {lines.map((l, i) => l ? <p key={i} className={styles.line}>{l}</p> : null)}
      </div>
      {onEdit && (
        <button
          className={styles.editBtn}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          aria-label="Modifier"
        >✎</button>
      )}
    </article>
  )
}
