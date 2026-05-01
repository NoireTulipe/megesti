import { useState, useEffect, useRef } from 'react'
import { useDepotsLibraires } from './hooks/useDepotsLibraires'
import type { DepotLibraire } from './hooks/useDepotsLibraires'
import { DepotLibraireForm } from './DepotLibraireForm'
import { SimpleEntityCard } from '@/components/SimpleEntityCard'
import { SlideOver } from '@/components/ui/SlideOver'
import { EmptyState } from '@/components/ui/EmptyState'
import styles from '@/features/auteurs/AuteursPage.module.css'

export function DepotsLibrairesPage() {
  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]     = useState<DepotLibraire | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useDepotsLibraires(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dépôts libraires</h1>
          <p className={styles.subtitle}>{items.length} dépôt{items.length > 1 ? 's' : ''} référencé{items.length > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouveau dépôt</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && <div className={styles.empty}><p>Impossible de charger les dépôts.</p></div>}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          emoji="📦"
          title={debounced ? `Aucun résultat pour « ${debounced} »` : 'Pas encore de dépôt libraire'}
          description={debounced ? undefined : 'Ajoutez les librairies et points de dépôt qui distribuent vos livres.'}
          action={debounced ? undefined : { label: '+ Nouveau dépôt', onClick: () => setShowCreate(true) }}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className={styles.grid}>
          {items.map(item => (
            <SimpleEntityCard
              key={item.id}
              nom={item.nom}
              icon="📦"
              color="sage"
              lines={[item.contact ?? '', item.adresse ?? ''].filter(Boolean)}
              onEdit={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      <SlideOver isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau dépôt" emoji="📦">
        <DepotLibraireForm onClose={() => setShowCreate(false)} />
      </SlideOver>

      <SlideOver isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier le dépôt" subtitle={editItem?.nom} emoji="📦">
        {editItem && <DepotLibraireForm depotLibraire={editItem} onClose={() => setEditItem(null)} />}
      </SlideOver>
    </div>
  )
}
