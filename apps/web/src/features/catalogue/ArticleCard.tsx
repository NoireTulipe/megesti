import { getImageUrl } from '@/lib/api'
import styles from './ArticleCard.module.css'
import type { Article } from './types'

interface Props {
  article:    Article
  onEdit?:    () => void
  onToggle?:  (actif: boolean) => void
  onClick?:   () => void
}

function StockPill({ article }: { article: Article }) {
  const { stock, stockAlerte, stockTension } = article
  let cls = styles.stockOk
  let label = `${stock} en stock`

  if (stock <= stockAlerte)  { cls = styles.stockAlerte;  label = `⚠ ${stock} — alerte` }
  else if (stock <= stockTension) { cls = styles.stockTension; label = `${stock} — attention` }

  return <span className={`${styles.stockPill} ${cls}`}>{label}</span>
}

export function ArticleCard({ article, onEdit, onToggle, onClick }: Props) {
  const retire = !article.actif

  return (
    <article
      className={`${styles.card}${retire ? ` ${styles.cardRetire}` : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Zone image */}
      <div className={styles.imgWrap}>
        {article.imageUrl
          ? <img src={getImageUrl(article.imageUrl)!} alt={article.nom} className={styles.img} />
          : (
            <div className={styles.imgPlaceholder}>
              <span className={styles.placeholderLetter}>{article.nom[0]?.toUpperCase()}</span>
              <div className={styles.placeholderDecor} aria-hidden="true" />
            </div>
          )
        }
        {retire && <span className={styles.badgeRetire}>Retiré</span>}
        {!article.vendable && (
          <span
            className={styles.badgeRetire}
            style={{ background: 'var(--mauve)', top: retire ? 38 : undefined }}
          >
            Matière première
          </span>
        )}
        {onToggle && (
          <button
            className={`${styles.retireBtn}${retire ? ` ${styles.retireBtnRestore}` : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(retire) }}
            title={retire ? 'Remettre au catalogue' : 'Retirer'}
          >
            {retire ? '↩' : '✕'}
          </button>
        )}
        {onEdit && (
          <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit() }} aria-label="Modifier">
            ✎
          </button>
        )}
      </div>

      {/* Corps */}
      <div className={styles.body}>
        <p className={styles.rayon}>{article.rayon.nom}{article.categorie ? ` · ${article.categorie.nom}` : ''}</p>
        <p className={styles.nom}>{article.nom}</p>
        {article.isbn && <p className={styles.isbn}>{article.isbn}</p>}

        <div className={styles.footer}>
          {article.vendable
            ? <span className={styles.prix}>{Number(article.prixVenteHT).toFixed(2)} €</span>
            : <span className={styles.prix} style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontWeight: 400 }}>Non vendable</span>
          }
          <StockPill article={article} />
        </div>

        {/* Badge imprimeur si lié */}
        {article.imprimeur && (
          <p className={styles.imprimeurBadge}>🖨 {article.imprimeur.nom}</p>
        )}
      </div>
    </article>
  )
}
