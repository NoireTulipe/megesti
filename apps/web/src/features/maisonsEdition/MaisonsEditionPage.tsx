import { useState, useEffect, useRef } from 'react'
import { useMaisonsEdition } from './hooks/useMaisonsEdition'
import type { MaisonEdition } from './hooks/useMaisonsEdition'
import { MaisonEditionCard } from './MaisonEditionCard'
import { MaisonEditionForm } from './MaisonEditionForm'
import styles from './MaisonsEditionPage.module.css'

type PanelState =
  | { mode: 'none' }
  | { mode: 'view'; item: MaisonEdition }
  | { mode: 'create' }

export function MaisonsEditionPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [panel, setPanel]         = useState<PanelState>({ mode: 'none' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useMaisonsEdition(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  useEffect(() => {
    if (panel.mode === 'view') {
      const fresh = items.find((i) => i.id === panel.item.id)
      if (fresh) setPanel((p) => ({ ...p, item: fresh }))
    }
  }, [items])

  function handleDone() { setPanel({ mode: 'none' }) }

  const activeId = panel.mode === 'view' ? panel.item.id : null

  return (
    <div className={styles.page}>
      {/* ── Colonne liste ── */}
      <div className={styles.listCol}>
        <div className={styles.listHeader}>
          <h1 className={styles.listTitle}>Maisons d'édition</h1>
          <div className={styles.listToolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={styles.btnNew} onClick={() => setPanel({ mode: 'create' })}>
              + Nouvelle
            </button>
          </div>
        </div>

        <div className={styles.listBody}>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}

          {isError && (
            <p className={styles.listEmpty}>Impossible de charger les maisons d'édition.</p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className={styles.listEmpty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
              {debounced
                ? `Aucun résultat pour « ${debounced} »`
                : 'Aucune maison d\'édition partenaire — ajoutez-en une !'}
            </div>
          )}

          {!isLoading && !isError && items.map((item) => (
            <MaisonEditionCard
              key={item.id}
              item={item}
              active={item.id === activeId}
              onSelect={() => setPanel({ mode: 'view', item })}
              onEdit={(e) => { e.stopPropagation(); setPanel({ mode: 'view', item }) }}
            />
          ))}
        </div>
      </div>

      {/* ── Panneau détail / formulaire ── */}
      <div className={styles.detailCol}>
        {panel.mode === 'none' && (
          <div className={styles.detailEmpty}>
            <div className={styles.detailEmptyBlob} />
            <span className={styles.detailEmptyIcon}>🏛️</span>
            <span className={styles.detailEmptyText}>Sélectionnez une maison pour voir son détail</span>
          </div>
        )}

        {panel.mode === 'view' && (
          <div className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelNom}>{panel.item.nom}</h2>
              <div className={styles.panelMeta}>
                {panel.item.email     && <span className={styles.badge}>✉ {panel.item.email}</span>}
                {panel.item.telephone && <span className={styles.badge}>☎ {panel.item.telephone}</span>}
                {panel.item.siret     && <span className={styles.badge}>SIRET {panel.item.siret}</span>}
              </div>
            </div>
            <div className={styles.panelBody}>
              <MaisonEditionForm maisonEdition={panel.item} onClose={handleDone} />
            </div>
          </div>
        )}

        {panel.mode === 'create' && (
          <div className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelNom}>Nouvelle maison d'édition</h2>
            </div>
            <div className={styles.panelBody}>
              <MaisonEditionForm onClose={handleDone} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
