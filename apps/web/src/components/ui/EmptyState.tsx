import styles from './EmptyState.module.css'

interface EmptyStateProps {
  emoji:       string
  title:       string
  description?: string
  action?:     { label: string; onClick: () => void }
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {/* Blob décoratif derrière */}
      <div className={styles.blob} aria-hidden="true" />

      <div className={styles.emojiWrap}>
        <span className={styles.emoji}>{emoji}</span>
        {/* Petits points décoratifs */}
        <span className={styles.dot1} />
        <span className={styles.dot2} />
        <span className={styles.dot3} />
      </div>

      <h2 className={styles.title}>{title}</h2>

      {description && <p className={styles.description}>{description}</p>}

      {action && (
        <button className={styles.cta} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
