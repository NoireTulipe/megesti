import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMascoteDialog } from '@/hooks/useMascoteDialog'
import { useHelp } from './HelpContext'
import styles from './HelpButton.module.css'

interface Props {
  slug:       string
  size?:      'sm' | 'md'
  variant?:   'default' | 'ghost'
  className?: string
}

/**
 * Bouton (?) contextuel — ouvre MeGestine en modale avec le dialog CMS identifié par `slug`.
 * Usage : <HelpButton slug="mon-dialog" />
 */
export function HelpButton({ slug, size = 'md', variant = 'default', className }: Props) {
  const { showHelp } = useHelp()
  const [open, setOpen] = useState(false)

  if (!showHelp) return null

  return (
    <>
      <button
        className={`${styles.btn} ${styles[size]} ${variant === 'ghost' ? styles.ghost : ''} ${className ?? ''}`}
        onClick={() => setOpen(true)}
        aria-label="Aide MeGestine"
        title="Aide"
      >
        ?
      </button>

      {open && <HelpModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Modale ────────────────────────────────────────────────────────────────────

function HelpModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, isLoading } = useMascoteDialog(slug)
  const navigate = useNavigate()

  function handleCta(href: string | undefined) {
    if (!href) return
    onClose()
    if (href.startsWith('http')) { window.open(href, '_blank'); return }
    navigate(href)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Fermer */}
        <button className={styles.close} onClick={onClose} aria-label="Fermer">✕</button>

        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
          </div>
        )}

        {!isLoading && data && (
          <div className={styles.content}>
            <img
              src={`/img/mascotte/${data.imageName}`}
              alt="MeGestine"
              className={styles.mascot}
            />
            <div className={styles.bubbles}>
              {data.bulles.map((b, i) => (
                <div key={i} className={styles.bubble}>
                  {b.title && <p className={styles.title}>{b.title}</p>}
                  <p className={styles.text}>{b.text}</p>
                  {b.cta && (
                    <button
                      className={styles.cta}
                      onClick={() => handleCta(b.cta!.href)}
                    >
                      {b.cta.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !data && (
          <p className={styles.notFound}>Dialog introuvable : <code>{slug}</code></p>
        )}

      </div>
    </div>
  )
}
