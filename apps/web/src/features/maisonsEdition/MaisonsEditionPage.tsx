import { useState, useEffect, useRef } from 'react'
import { useMaisonsEdition } from './hooks/useMaisonsEdition'
import type { MaisonEdition } from './hooks/useMaisonsEdition'
import { MaisonEditionCard } from './MaisonEditionCard'
import { MaisonEditionForm } from './MaisonEditionForm'
import { Modal } from '@/components/ui/Modal'
import { MascoteBlock } from '@/components/MascoteBlock'
import { PageHero } from '@/components/PageHero'
import styles from './MaisonsEditionPage.module.css'

export function MaisonsEditionPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]     = useState<MaisonEdition | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useMaisonsEdition(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  function handleClose() {
    setShowCreate(false)
    setEditItem(null)
  }

  return (
    <div className={styles.page}>
      <PageHero
        title="Maisons d'édition"
        subtitle={<>{items.length} maison{items.length !== 1 ? 's' : ''}{debounced ? ` · résultats pour « ${debounced} »` : ''}</>}
      >
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle maison
          </button>
        </div>
      </PageHero>

      {/* ── Loader ── */}
      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {/* ── Erreur ── */}
      {isError && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className={styles.emptyTitle}>Impossible de charger les maisons d'édition</div>
        </div>
      )}

      {/* ── Vide ── */}
      {!isLoading && !isError && items.length === 0 && (
        debounced ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div className={styles.emptyTitle}>Aucun résultat pour « {debounced} »</div>
          </div>
        ) : (
          <MascoteBlock slug="maisons-vide" onCta={() => setShowCreate(true)} />
        )
      )}

      {/* ── Grille ── */}
      {!isLoading && !isError && items.length > 0 && (
        <div className={styles.grid}>
          {items.map(item => (
            <MaisonEditionCard
              key={item.id}
              item={item}
              active={editItem?.id === item.id}
              onClick={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      {/* ── Modale création ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle maison d'édition"
        subtitle="Ajoutez un partenaire éditorial"
        size="lg"
      >
        <MaisonEditionForm onClose={handleClose} />
      </Modal>

      {/* ── Modale édition ── */}
      <Modal
        isOpen={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Modifier la maison"
        subtitle={editItem?.nom}
        size="lg"
      >
        {editItem && <MaisonEditionForm maisonEdition={editItem} onClose={handleClose} />}
      </Modal>
    </div>
  )
}
