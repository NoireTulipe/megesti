import { useEffect, type ReactNode, type MouseEvent } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  isOpen:    boolean
  title:     string
  subtitle?: string
  onClose:   () => void
  children:  ReactNode
  size?:     'md' | 'lg' | 'xl'
  /** Largeur en px configurée dans le FormBuilder. Écrase `size`. */
  width?:    number
}

export function Modal({ isOpen, title, subtitle, onClose, children, size = 'lg', width }: ModalProps) {
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

  const handleOverlay = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const inlineStyle = width ? { width, maxWidth: '95vw' } : undefined

  return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div
        className={`${styles.dialog} ${styles[size]}`}
        style={inlineStyle}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.accent} />

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  )
}
