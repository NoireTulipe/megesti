import styles from './LivreCard.module.css'
import type { Livre } from './types'

interface Props {
  livre: Livre
  onClick?: () => void
}

function nomComplet(a: Livre['auteurs'][number]['auteur']): string {
  return a.pseudonyme ?? `${a.prenom} ${a.nom}`
}

export function LivreCard({ livre, onClick }: Props) {
  const auteursLabel = livre.auteurs.map((a) => nomComplet(a.auteur)).join(', ')
  const prix = parseFloat(livre.prix).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

  return (
    <article className={styles.card} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={styles.cover}>
        {livre.couvertureUrl
          ? <img src={livre.couvertureUrl} alt={livre.titre} className={styles.coverImg} />
          : <div className={styles.coverPlaceholder}><span>{livre.titre[0]}</span></div>
        }
      </div>
      <div className={styles.body}>
        <p className={styles.auteurs}>{auteursLabel}</p>
        <h3 className={styles.titre}>{livre.titre}</h3>
        {livre.isbn && <p className={styles.isbn}>ISBN {livre.isbn}</p>}
        <div className={styles.footer}>
          <span className={styles.prix}>{prix}</span>
          <span className={`${styles.stock} ${livre.stock === 0 ? styles.rupture : ''}`}>
            {livre.stock === 0 ? 'Rupture' : `${livre.stock} ex.`}
          </span>
        </div>
      </div>
    </article>
  )
}
