import { useNavigate } from 'react-router-dom'
import { useMascoteDialog } from '@/hooks/useMascoteDialog'
import styles from './MascoteBlock.module.css'

interface Props {
  slug:    string
  /** Callback pour les CTA dont l'action n'est pas une URL (ex: ouvrir une modale) */
  onCta?:  (href: string | undefined, label: string) => void
  /** Contenu affiché pendant le chargement ou si le dialog n'existe pas en BDD */
  fallback?: React.ReactNode
}

/**
 * Composant générique MeGestine — lit le contenu depuis le CMS admin.
 * Si le dialog n'existe pas encore, affiche `fallback` (null par défaut).
 */
export function MascoteBlock({ slug, onCta, fallback = null }: Props) {
  const { data, isLoading } = useMascoteDialog(slug)
  const navigate = useNavigate()

  if (isLoading) return <>{fallback}</>
  if (!data)     return <>{fallback}</>

  function handleCta(href: string | undefined, label: string) {
    if (onCta) { onCta(href, label); return }
    if (!href)  return
    if (href.startsWith('http')) { window.open(href, '_blank'); return }
    navigate(href)
  }

  return (
    <div className={styles.wrap}>
      <img
        src={`/img/mascotte/${data.imageName}`}
        alt="MeGestine"
        className={styles.img}
      />
      <div className={styles.bubbles}>
        {data.bulles.map((b, i) => (
          <div key={i} className={styles.bubble}>
            {b.title && <p className={styles.title}>{b.title}</p>}
            <p className={styles.text}>{b.text}</p>
            {b.cta && (
              <button className={styles.btn} onClick={() => handleCta(b.cta!.href, b.cta!.label)}>
                {b.cta.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
