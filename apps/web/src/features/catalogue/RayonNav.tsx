import { useState, useEffect, useRef } from 'react'
import type { Rayon } from './types'
import styles from './RayonNav.module.css'

interface RayonNavProps {
  rayons:         Rayon[]
  activeRayon:    string | undefined
  activeCat:      string | undefined
  onRayonChange:  (rayonId: string) => void
  onCatChange:    (catId: string | undefined) => void
}

export function RayonNav({ rayons, activeRayon, activeCat, onRayonChange, onCatChange }: RayonNavProps) {
  const currentRayon = rayons.find(r => r.id === activeRayon)
  const cats         = currentRayon?.categories ?? []

  return (
    <div className={styles.wrap}>
      <nav className={styles.rayonRow}>
        {rayons.map(r => (
          <button
            key={r.id}
            className={`${styles.rayonBtn} ${activeRayon === r.id ? styles.active : ''}`}
            onClick={() => onRayonChange(r.id)}
          >
            {r.nom}
            {r.categories.length > 0 && activeRayon === r.id && (
              <span className={styles.chevron}>▾</span>
            )}
          </button>
        ))}
      </nav>

      {cats.length > 0 && (
        <nav className={styles.catWrap}>
          <button
            className={`${styles.catBtn} ${!activeCat ? styles.catActive : ''}`}
            onClick={() => onCatChange(undefined)}
          >
            Toutes
          </button>
          {cats.map(c => (
            <button
              key={c.id}
              className={`${styles.catBtn} ${activeCat === c.id ? styles.catActive : ''}`}
              onClick={() => onCatChange(c.id)}
            >
              {c.nom}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

/**
 * Hook pour gérer la sélection rayon/catégorie avec persistance localStorage.
 * Initialise sur le premier rayon au premier chargement.
 */
export function useRayonFilter(lsKey: string, rayons: Rayon[]) {
  const [activeRayon, setActiveRayon] = useState<string | undefined>(undefined)
  const [activeCat,   setActiveCat]   = useState<string | undefined>(undefined)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || rayons.length === 0) return
    initialized.current = true
    try {
      const saved      = JSON.parse(localStorage.getItem(lsKey) ?? '{}')
      const savedRayon = rayons.find(r => r.id === saved.rayonId)
      const rayon      = savedRayon ?? rayons[0]
      if (!rayon) return
      setActiveRayon(rayon.id)
      if (saved.catId && rayon.categories.find(c => c.id === saved.catId)) {
        setActiveCat(saved.catId)
      }
    } catch {
      const first = rayons[0]
      if (first) setActiveRayon(first.id)
    }
  }, [rayons, lsKey])

  function handleRayonChange(rayonId: string) {
    setActiveRayon(rayonId)
    setActiveCat(undefined)
    localStorage.setItem(lsKey, JSON.stringify({ rayonId }))
  }

  function handleCatChange(catId: string | undefined) {
    setActiveCat(catId)
    localStorage.setItem(lsKey, JSON.stringify({ rayonId: activeRayon, catId }))
  }

  return { activeRayon, activeCat, handleRayonChange, handleCatChange }
}
