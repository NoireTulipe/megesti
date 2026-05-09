import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePopups, useMarkPopupVu, type PopupData } from '@/hooks/usePopups'
import styles from './PopupOverlay.module.css'

/**
 * À placer dans AppLayout — surveille la route courante et affiche les popups
 * en attente l'un après l'autre.
 */
export function PopupOverlay() {
  const location = useLocation()
  const { data: popups = [] } = usePopups(location.pathname)

  // Affiche uniquement le premier popup en attente
  const popup = popups[0] ?? null

  if (!popup) return null
  return <PopupModal popup={popup} />
}

// ── Modale ────────────────────────────────────────────────────────────────────

function PopupModal({ popup }: { popup: PopupData }) {
  const [slideIdx,    setSlideIdx]    = useState(0)
  const [dismissed,   setDismissed]   = useState(false)
  const [open,        setOpen]        = useState(true)
  const markVu = useMarkPopupVu()
  const navigate = useNavigate()

  const slide      = popup.slides[slideIdx]
  const isLast     = slideIdx === popup.slides.length - 1
  const isBlocking = popup.mode === 'ALWAYS_BLOCKING'

  // SHOW_ONCE : marquer vu immédiatement à l'affichage
  useEffect(() => {
    if (popup.mode === 'SHOW_ONCE') markVu.mutate(popup.id)
  }, [popup.id])

  function handleClose() {
    if (isBlocking) return
    if (popup.mode === 'DISMISSIBLE' && dismissed) markVu.mutate(popup.id)
    setOpen(false)
  }

  function handleNext() {
    if (!isLast) { setSlideIdx(i => i + 1); return }
    handleClose()
  }

  function handleCta(href?: string) {
    if (!href) return
    handleClose()
    if (href.startsWith('http')) { window.open(href, '_blank'); return }
    navigate(href)
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={isBlocking ? undefined : handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Fermer — masqué si bloquant */}
        {!isBlocking && (
          <button className={styles.close} onClick={handleClose} aria-label="Fermer">✕</button>
        )}

        {/* Indicateur de slides */}
        {popup.slides.length > 1 && (
          <div className={styles.dots}>
            {popup.slides.map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === slideIdx ? styles.dotActive : ''}`} />
            ))}
          </div>
        )}

        {/* Contenu */}
        <div className={styles.content}>
          <img
            src={`/img/mascotte/${slide.imageName}`}
            alt="MeGestine"
            className={styles.mascot}
          />
          <div className={styles.bubble}>
            {slide.title && <p className={styles.title}>{slide.title}</p>}
            <p className={styles.text}>{slide.text}</p>

            {slide.ctaLabel && (
              <button className={styles.cta} onClick={() => handleCta(slide.ctaHref)}>
                {slide.ctaLabel}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {/* Case "Ne plus afficher" */}
          {popup.mode === 'DISMISSIBLE' && isLast && (
            <label className={styles.dismissWrap}>
              <input type="checkbox" checked={dismissed}
                onChange={e => setDismissed(e.target.checked)}
                className={styles.dismissCheck} />
              <span className={styles.dismissText}>{popup.dismissText}</span>
            </label>
          )}

          {/* Bouton suivant / fermer */}
          {!isBlocking && (
            <button className={styles.nextBtn} onClick={handleNext}>
              {isLast ? 'Fermer' : 'Suivant →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
