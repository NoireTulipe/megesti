import styles from './AuteurCard.module.css'
import type { Auteur } from './hooks/useAuteurs'

const GRADIENTS = [
  'linear-gradient(135deg,#C4907C,#D4A070)',
  'linear-gradient(135deg,#8B7BAB,#A090C0)',
  'linear-gradient(135deg,#6B8F71,#85A88A)',
  'linear-gradient(135deg,#C9933A,#D4A855)',
  'linear-gradient(135deg,#5B6E8A,#7090B8)',
]

function cardGradient(name: string) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

function initiales(auteur: Auteur) {
  return `${auteur.prenom[0]}${auteur.nom[0]}`.toUpperCase()
}

interface Props {
  auteur:   Auteur
  onClick?: () => void
}

export function AuteurCard({ auteur, onClick }: Props) {
  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`
  const gradient   = cardGradient(auteur.nom)
  const bgColor    = gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#C4907C'

  return (
    <article
      className={styles.card}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <div className={styles.bg} style={{
        background: `radial-gradient(ellipse at 80% 20%,${bgColor}18 0%,transparent 70%)`,
      }} />

      <div className={styles.avatar} style={{ background: gradient }}>
        {initiales(auteur)}
      </div>

      <div className={styles.body}>
        <div className={styles.nom}>{nomAffiche}</div>
        {auteur.pseudonyme && (
          <div className={styles.civil}>{auteur.prenom} {auteur.nom}</div>
        )}
        {auteur.email && (
          <div className={styles.email}>{auteur.email}</div>
        )}
        <div className={styles.pills}>
          {auteur._count.contrats > 0 && (
            <span className={`${styles.pill} ${styles.pillContrats}`}>
              {auteur._count.contrats} contrat{auteur._count.contrats > 1 ? 's' : ''}
            </span>
          )}
          {auteur._count.articles > 0 && (
            <span className={`${styles.pill} ${styles.pillLivres}`}>
              {auteur._count.articles} livre{auteur._count.articles > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

    </article>
  )
}
