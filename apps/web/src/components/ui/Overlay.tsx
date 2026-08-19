import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface OverlayProps {
  onClose:   () => void
  /** Classe du backdrop (spécifique à chaque feature). */
  className?: string | undefined
  children:  ReactNode
}

/**
 * Primitive commune des dialogs sur-mesure : portal vers body, fermeture au
 * clic backdrop et à Échap, verrouillage du scroll. Le panneau enfant doit
 * garder son stopPropagation. Pour les dialogs standards (header titre +
 * corps), utiliser Modal (formulaires/confirmations) ou SlideOver (détail).
 */
export function Overlay({ onClose, className, children }: OverlayProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className={className} onClick={onClose}>
      {children}
    </div>,
    document.body,
  )
}
