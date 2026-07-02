import styles from './AuteurCard.module.css'
import type { Auteur } from './hooks/useAuteurs'
import { avatarGradient as cardGradient } from '@/lib/gradients'

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
