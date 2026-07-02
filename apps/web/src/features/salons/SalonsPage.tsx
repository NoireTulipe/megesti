import { useState, useEffect, useRef } from 'react'
import { Overlay } from '@/components/ui/Overlay'
import { useSalons } from './hooks/useSalons'
import type { Salon } from './hooks/useSalons'
import { SalonCard }   from './SalonCard'
import { SalonDetail } from './SalonDetail'
import { MascoteBlock } from '@/components/MascoteBlock'
import { PageHero } from '@/components/PageHero'
import { SearchInput } from '@/components/SearchInput'
import styles from './SalonsPage.module.css'

export function SalonsPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editSalon, setEditSalon]   = useState<Salon | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: salons = [], isLoading } = useSalons(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  // Sync après mutation
  useEffect(() => {
    if (editSalon) {
      const fresh = salons.find((s) => s.id === editSalon.id)
      if (fresh) setEditSalon(fresh)
    }
  }, [salons])

  function handleDone() {
    setShowCreate(false)
    setEditSalon(null)
  }

  return (
    <div className={styles.page}>
      <PageHero
        title="Salons & événements"
        subtitle={<>{salons.length} salon{salons.length !== 1 ? 's' : ''}{debounced ? ` · résultats pour « ${debounced} »` : ''}</>}
      >
        <div className={styles.headerActions}>
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => { setSearch(''); setDebounced('') }}
            placeholder="Rechercher un salon…"
          />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau salon
          </button>
        </div>
      </PageHero>

      {/* ── Loader ── */}
      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {/* ── Vide ── */}
      {!isLoading && salons.length === 0 && (
        debounced ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className={styles.emptyTitle}>Aucun résultat pour « {debounced} »</div>
          </div>
        ) : (
          <MascoteBlock slug="salons-vide" onCta={() => setShowCreate(true)} />
        )
      )}

      {/* ── Grille ── */}
      {!isLoading && salons.length > 0 && (
        <div className={styles.grid}>
          {salons.map(salon => (
            <SalonCard
              key={salon.id}
              salon={salon}
              active={editSalon?.id === salon.id}
              onClick={() => setEditSalon(salon)}
            />
          ))}
        </div>
      )}

      {/* ── Overlay création ── */}
      {showCreate && (
        <Overlay className={styles.detailOverlay} onClose={() => setShowCreate(false)}>
          <div className={styles.detailDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.detailAccent} />
            <button className={styles.detailClose} onClick={() => setShowCreate(false)} aria-label="Fermer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className={styles.detailBody}>
              <SalonDetail onDone={handleDone} onCancel={() => setShowCreate(false)} />
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Overlay édition ── */}
      {editSalon && (
        <Overlay className={styles.detailOverlay} onClose={() => setEditSalon(null)}>
          <div className={styles.detailDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.detailAccent} />
            <button className={styles.detailClose} onClick={() => setEditSalon(null)} aria-label="Fermer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className={styles.detailBody}>
              <SalonDetail
                salon={editSalon}
                onDone={handleDone}
                onCancel={() => setEditSalon(null)}
              />
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}
