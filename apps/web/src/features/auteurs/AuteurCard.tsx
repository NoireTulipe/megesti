import styles from './AuteurCard.module.css'
import type { Auteur } from './hooks/useAuteurs'

interface Props {
  auteur:   Auteur
  onClick?: () => void
  onEdit?:  () => void
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #C4907C 0%, #D4A070 100%)',
  'linear-gradient(135deg, #8B7BAB 0%, #A090C0 100%)',
  'linear-gradient(135deg, #6B8F71 0%, #85A88A 100%)',
  'linear-gradient(135deg, #C9933A 0%, #D4A855 100%)',
  'linear-gradient(135deg, #3D5470 0%, #5470A0 100%)',
]

function avatarGradient(name: string) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length]
}

function initiales(auteur: Auteur): string {
  return `${auteur.prenom[0]}${auteur.nom[0]}`.toUpperCase()
}

export function AuteurCard({ auteur, onClick, onEdit }: Props) {
  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`
  const gradient   = avatarGradient(auteur.nom)

  return (
    <article
      className={styles.card}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Fond dégradé subtil lié à l'auteur */}
      <div className={styles.bg} style={{ background: gradient.replace('135deg', '180deg').replace('100%)', '8%) 0%, transparent 100%)').replace('linear-gradient', 'radial-gradient') }} />

      {/* Initiales */}
      <div className={styles.initiales} style={{ background: gradient }}>
        {initiales(auteur)}
      </div>

      {/* Nom — le plus important */}
      <h3 className={styles.nom}>{nomAffiche}</h3>

      {/* Nom civil sous le pseudonyme */}
      {auteur.pseudonyme && (
        <p className={styles.nomCivil}>{auteur.prenom} {auteur.nom}</p>
      )}

      {/* Email discret si présent */}
      {auteur.email && (
        <a
          href={`mailto:${auteur.email}`}
          className={styles.email}
          onClick={e => e.stopPropagation()}
        >
          {auteur.email}
        </a>
      )}

      {/* Nb contrats */}
      {auteur._count.contrats > 0 && (
        <span className={styles.contratsBadge}>
          {auteur._count.contrats} contrat{auteur._count.contrats > 1 ? 's' : ''}
        </span>
      )}

      {/* Bouton modifier */}
      {onEdit && (
        <button
          className={styles.editBtn}
          onClick={e => { e.stopPropagation(); onEdit() }}
          aria-label="Modifier"
        >
          Modifier
        </button>
      )}
    </article>
  )
}
