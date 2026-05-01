import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './SlideOver.module.css'

interface SlideOverProps {
  isOpen:    boolean
  title:     string
  subtitle?: string
  emoji?:    string
  onClose:   () => void
  children:  ReactNode
  width?:    number
}

export function SlideOver({ isOpen, title, subtitle, emoji, onClose, children, width = 540 }: SlideOverProps) {
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} style={{ width, maxWidth: '95vw' }} role="dialog" aria-modal="true">

        {/* Décoration haut */}
        <div className={styles.topBar} />

        {/* En-tête */}
        <div className={styles.header}>
          {emoji && (
            <div className={styles.emojiWrap}>
              <span className={styles.emoji}>{emoji}</span>
            </div>
          )}
          <div className={styles.headerText}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={15} />
          </button>
        </div>

        {/* Corps */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Décoration bas — flocon discret */}
        <div className={styles.bottomDecor} aria-hidden="true">
          <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.bottomSvg}>
            <ellipse cx="100" cy="80" rx="120" ry="60" fill="url(#grad)" fillOpacity="0.06"/>
            <defs>
              <radialGradient id="grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#C4907C"/>
                <stop offset="100%" stopColor="#8B7BAB" stopOpacity="0"/>
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
