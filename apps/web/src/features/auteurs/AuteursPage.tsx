import { useState, useEffect, useRef } from 'react'
import { useAuteurs } from './hooks/useAuteurs'
import { AuteurCard } from './AuteurCard'
import { AuteurForm } from './AuteurForm'
import { Modal } from '@/components/ui/Modal'
import styles from './AuteursPage.module.css'

export function AuteursPage() {
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [showModal, setShowModal]         = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: auteurs, isLoading, isError } = useAuteurs(debouncedSearch || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Auteur·ices</h1>
          <p className={styles.subtitle}>{auteurs?.length ?? '—'} auteur{(auteurs?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            + Nouvel auteur·ice
          </button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={styles.empty}><p>Impossible de charger les auteurs.</p></div>
      )}

      {!isLoading && !isError && auteurs?.length === 0 && (
        <div className={styles.empty}>
          <p>Aucun auteur{debouncedSearch ? ` pour « ${debouncedSearch} »` : ''}.</p>
        </div>
      )}

      {!isLoading && !isError && auteurs && auteurs.length > 0 && (
        <div className={styles.grid}>
          {auteurs.map((auteur) => (
            <AuteurCard key={auteur.id} auteur={auteur} />
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvel auteur·ice"
      >
        <AuteurForm onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
