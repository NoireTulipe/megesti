import styles from './ArticleCard.module.css'
import type { Article } from './types'

interface Props {
  article:    Article
  onEdit?:    () => void
  onToggle?:  (actif: boolean) => void
}

export function ArticleCard({ article, onEdit, onToggle }: Props) {
  const retire = !article.actif

  return (
    <article className={`${styles.card}${retire ? ` ${styles.cardRetire}` : ''}`}>
      {article.imageUrl
        ? <img src={article.imageUrl} alt={article.nom} className={styles.img} />
        : <div className={styles.imgPlaceholder}>{article.nom[0]?.toUpperCase()}</div>
      }

      {retire && <span className={styles.badgeRetire}>Retiré</span>}

      <div className={styles.body}>
        <p className={styles.rayon}>{article.rayon.nom}{article.categorie ? ` · ${article.categorie.nom}` : ''}</p>
        <p className={styles.nom}>{article.nom}</p>
        {article.isbn && <p className={styles.isbn}>{article.isbn}</p>}
        <p className={styles.prix}>{Number(article.prixVenteHT).toFixed(2)} € HT</p>
        <p className={styles.stock}>{article.stock} en stock</p>
      </div>

      {onToggle && (
        <button
          className={`${styles.retireBtn}${retire ? ` ${styles.retireBtnRestore}` : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(!retire) }}
          title={retire ? 'Remettre au catalogue' : 'Retirer du catalogue'}
          aria-label={retire ? 'Remettre au catalogue' : 'Retirer du catalogue'}
        >
          {retire ? '↩' : '✕'}
        </button>
      )}

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
