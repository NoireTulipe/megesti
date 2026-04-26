import styles from './AuteurCard.module.css'
import type { Auteur } from './hooks/useAuteurs'

interface Props {
  auteur:   Auteur
  onClick?: () => void
  onEdit?:  () => void
}

function initiales(auteur: Auteur): string {
  return `${auteur.prenom[0]}${auteur.nom[0]}`.toUpperCase()
}

export function AuteurCard({ auteur, onClick, onEdit }: Props) {
  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`

  return (
    <article className={styles.card} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={styles.avatar}>{initiales(auteur)}</div>
      <div className={styles.body}>
        <h3 className={styles.nom}>{nomAffiche}</h3>
        {auteur.pseudonyme && <p className={styles.nomCivil}>{auteur.prenom} {auteur.nom}</p>}
        {auteur.bio && <p className={styles.bio}>{auteur.bio}</p>}
        {auteur.email && <p className={styles.email}>{auteur.email}</p>}
      </div>
      {onEdit && (
        <button
          className={styles.editBtn}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          aria-label="Modifier"
        >
          ✎
        </button>
      )}
    </article>
  )
}
