import styles from './PageLoader.module.css'

/** Loader plein cadre — 3 points pulsants aux couleurs de la maison. */
export function PageLoader() {
  return (
    <div className={styles.wrap} role="status" aria-label="Chargement">
      <span className={styles.dot} style={{ background: 'var(--rose)' }} />
      <span className={styles.dot} style={{ background: 'var(--mauve)', animationDelay: '0.15s' }} />
      <span className={styles.dot} style={{ background: 'var(--gold)', animationDelay: '0.3s' }} />
    </div>
  )
}
