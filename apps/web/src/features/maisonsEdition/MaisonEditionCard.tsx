import type { MaisonEdition } from './hooks/useMaisonsEdition'
import styles from './MaisonEditionCard.module.css'

interface Props {
  item:     MaisonEdition
  active:   boolean
  onSelect: () => void
  onEdit:   (e: React.MouseEvent) => void
}

export function MaisonEditionCard({ item, active, onSelect, onEdit }: Props) {
  return (
    <div
      className={`${styles.card}${active ? ` ${styles.cardActive}` : ''}`}
      onClick={onSelect}
    >
      <div className={styles.main}>
        <div className={styles.topRow}>
          <span className={styles.icon}>🏛️</span>
          <h3 className={styles.nom}>{item.nom}</h3>
        </div>
        {(item.email || item.telephone || item.siret) && (
          <div className={styles.meta}>
            {item.email     && <span className={styles.metaItem}>✉ {item.email}</span>}
            {item.telephone && <span className={styles.metaItem}>☎ {item.telephone}</span>}
            {item.siret     && <span className={styles.metaItem}>SIRET {item.siret}</span>}
          </div>
        )}
      </div>
      <button className={styles.editBtn} onClick={onEdit}>✎ Modifier</button>
    </div>
  )
}
