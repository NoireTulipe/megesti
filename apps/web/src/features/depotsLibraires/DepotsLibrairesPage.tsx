import { useState, useEffect, useRef } from 'react'
import { useDepotsLibraires } from './hooks/useDepotsLibraires'
import type { DepotLibraire } from './hooks/useDepotsLibraires'
import { DepotLibraireForm } from './DepotLibraireForm'
import { SimpleEntityCard } from '@/components/SimpleEntityCard'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import styles from '@/features/auteurs/AuteursPage.module.css'

export function DepotsLibrairesPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]   = useState<DepotLibraire | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items, isLoading, isError } = useDepotsLibraires(debounced || undefined)

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
          <p className={styles.subtitle}>{items?.length ?? '—'} dépôt{(items?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouveau dépôt</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}
      {isError && <div className={styles.empty}><p>Impossible de charger les dépôts.</p></div>}
      {!isLoading && !isError && items?.length === 0 && (
        <div className={styles.empty}><p>Aucun dépôt{debounced ? ` pour « ${debounced} »` : ''}.</p></div>
      )}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => (
            <SimpleEntityCard
              key={item.id}
              nom={item.nom}
              icon="📦"
              lines={[item.contact ?? '', item.adresse ?? ''].filter(Boolean)}
              onEdit={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau dépôt libraire" width={getFormWidth('depotLibraire')}>
        <DepotLibraireForm onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier le dépôt" subtitle={editItem?.nom} width={getFormWidth('depotLibraire')}>
        {editItem && <DepotLibraireForm depotLibraire={editItem} onClose={() => setEditItem(null)} />}
      </Modal>
    </div>
  )
}
