import { useState, useEffect, useRef } from 'react'
import { useLivres } from './hooks/useLivres'
import { LivreCard } from './LivreCard'
import styles from './CataloguePage.module.css'

export function CataloguePage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: livres, isLoading, isError } = useLivres(debouncedSearch || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Catalogue</h1>
          <p className={styles.subtitle}>{livres?.length ?? '—'} titre{(livres?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Rechercher un titre…"
            value={search}
            onChange={handleSearch}
          />
          <button className={styles.btnPrimary}>+ Nouveau livre</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {isError && (
        <div className={styles.empty}>
          <p>Impossible de charger le catalogue.</p>
        </div>
      )}

      {!isLoading && !isError && livres?.length === 0 && (
        <div className={styles.empty}>
          <p>Aucun livre trouvé{debouncedSearch ? ` pour « ${debouncedSearch} »` : ''}.</p>
        </div>
      )}

      {!isLoading && !isError && livres && livres.length > 0 && (
        <div className={styles.grid}>
          {livres.map((livre) => (
            <LivreCard key={livre.id} livre={livre} />
          ))}
        </div>
      )}
    </div>
  )
}
