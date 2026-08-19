import type { MaisonEdition } from './hooks/useMaisonsEdition'
import styles from './MaisonEditionCard.module.css'

function avatarColor(nom: string) {
  const colors = ['#C4907C','#8B7BAB','#6B8F71','#C9933A','#3D5470','#A07090','#5B8A8A']
  let hash = 0
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initials(nom: string) {
  return nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

interface Props {
  item:   MaisonEdition
  active: boolean
  onClick: () => void
}

export function MaisonEditionCard({ item, active, onClick }: Props) {
  const color = avatarColor(item.nom)

  return (
    <div
      className={`${styles.card}${active ? ` ${styles.cardActive}` : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatar} style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
        {initials(item.nom)}
      </div>
      <div className={styles.body}>
        <span className={styles.nom}>{item.nom}</span>
        {item.email && <span className={styles.email}>{item.email}</span>}
        <div className={styles.pills}>
          {item.siret && <span className={`${styles.pill} ${styles.pillSiret}`}>SIRET {item.siret}</span>}
          {item.telephone && <span className={`${styles.pill} ${styles.pillPhone}`}>{item.telephone}</span>}
        </div>
      </div>
    </div>
  )
}
