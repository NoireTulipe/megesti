import styles from './ArticleCard.module.css'
import type { Article } from './types'

interface Props {
  article: Article
  onEdit?: () => void
}

export function ArticleCard({ article, onEdit }: Props) {
  return (
    <article className={styles.card}>
      {article.imageUrl
        ? <img src={article.imageUrl} alt={article.nom} className={styles.img} />
        : <div className={styles.imgPlaceholder}>{article.nom[0]?.toUpperCase()}</div>
      }
      <div className={styles.body}>
        <p className={styles.rayon}>{article.rayon.nom}{article.categorie ? ` · ${article.categorie.nom}` : ''}</p>
        <p className={styles.nom}>{article.nom}</p>
        {article.isbn && <p className={styles.isbn}>{article.isbn}</p>}
        <p className={styles.prix}>{Number(article.prixVenteHT).toFixed(2)} € HT</p>
        <p className={styles.stock}>{article.stock} en stock</p>
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
