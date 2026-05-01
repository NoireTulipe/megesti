import { useState, useEffect, useRef } from 'react'
import { useSalons } from './hooks/useSalons'
import type { Salon } from './hooks/useSalons'
import { SalonCard }   from './SalonCard'
import { SalonDetail } from './SalonDetail'
import styles from './SalonsPage.module.css'

type PanelState =
  | { mode: 'none' }
  | { mode: 'view'; salon: Salon }
  | { mode: 'edit'; salon: Salon }
  | { mode: 'create' }

export function SalonsPage() {
  const [search, setSearch]   = useState('')
  const [debounced, setDebounced] = useState('')
  const [panel, setPanel]     = useState<PanelState>({ mode: 'none' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: salons = [], isLoading } = useSalons(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  // Sync panel après mutation (refresh des données)
  useEffect(() => {
    if (panel.mode === 'view' || panel.mode === 'edit') {
      const fresh = salons.find((s) => s.id === panel.salon.id)
      if (fresh) setPanel((p) => ({ ...p, salon: fresh }))
    }
  }, [salons])

  function handleSelect(salon: Salon) {
    setPanel({ mode: 'view', salon })
  }

  function handleEdit(salon: Salon, e: React.MouseEvent) {
    e.stopPropagation()
    setPanel({ mode: 'edit', salon })
  }

  function handleDone() {
    setPanel({ mode: 'none' })
  }

  const activeId = (panel.mode === 'view' || panel.mode === 'edit') ? panel.salon.id : null

  return (
    <div className={styles.page}>
      {/* ── Colonne liste ── */}
      <div className={styles.listCol}>
        <div className={styles.listHeader}>
          <h1 className={styles.listTitle}>Salons & événements</h1>
          <div className={styles.listToolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className={styles.btnNew}
              onClick={() => setPanel({ mode: 'create' })}
            >
              + Nouveau
            </button>
          </div>
        </div>

        <div className={styles.listBody}>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}

          {!isLoading && salons.length === 0 && (
            <div className={styles.listEmpty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎪</div>
              {debounced ? `Aucun résultat pour « ${debounced} »` : 'Votre calendrier est vide — ajoutez votre premier salon !'}
            </div>
          )}

          {!isLoading && salons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              active={salon.id === activeId}
              onSelect={() => handleSelect(salon)}
              onEdit={(e) => handleEdit(salon, e)}
            />
          ))}
        </div>
      </div>

      {/* ── Panneau détail / éditeur ── */}
      <div className={styles.detailCol}>
        {panel.mode === 'none' && (
          <div className={styles.detailEmpty}>
            <div className={styles.detailEmptyBlob} />
            <span className={styles.detailEmptyIcon}>🗓️</span>
            <span className={styles.detailEmptyText}>Sélectionnez un salon pour voir son détail</span>
          </div>
        )}

        {panel.mode === 'view' && (
          <SalonDetail
            salon={panel.salon}
            onDone={handleDone}
            onCancel={handleDone}
          />
        )}

        {panel.mode === 'edit' && (
          <SalonDetail
            salon={panel.salon}
            onDone={handleDone}
            onCancel={() => setPanel({ mode: 'view', salon: panel.salon })}
          />
        )}

        {panel.mode === 'create' && (
          <SalonDetail
            onDone={handleDone}
            onCancel={handleDone}
          />
        )}
      </div>
    </div>
  )
}
