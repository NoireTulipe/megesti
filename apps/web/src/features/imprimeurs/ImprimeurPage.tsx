import { useState, useEffect, useRef } from 'react'
import { useImprimeurs } from './hooks/useImprimeurs'
import type { Imprimeur } from './hooks/useImprimeurs'
import { ImprimeurCard } from './ImprimeurCard'
import { ImprimeurForm } from './ImprimeurForm'
import { SlideOver } from '@/components/ui/SlideOver'
import { EmptyState } from '@/components/ui/EmptyState'
import styles from '@/features/auteurs/AuteursPage.module.css'

export function ImprimeurPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]   = useState<Imprimeur | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useImprimeurs(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Imprimeurs</h1>
          <p className={styles.subtitle}>
            {items.length} imprimeur{items.length > 1 ? 's' : ''} référencé{items.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            + Nouvel imprimeur
          </button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={styles.empty}><p>Impossible de charger les imprimeurs.</p></div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          emoji="🖨️"
          title={debounced ? `Aucun résultat pour « ${debounced} »` : 'Aucun imprimeur référencé'}
          description={debounced ? undefined : 'Ajoutez vos imprimeurs pour les retrouver en un clic depuis chaque livre.'}
          action={debounced ? undefined : { label: '+ Nouvel imprimeur', onClick: () => setShowCreate(true) }}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className={styles.grid}>
          {items.map(item => (
            <ImprimeurCard key={item.id} imprimeur={item} onEdit={() => setEditItem(item)} />
          ))}
        </div>
      )}

      <SlideOver isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel imprimeur" emoji="🖨️">
        <ImprimeurForm onClose={() => setShowCreate(false)} />
      </SlideOver>

      <SlideOver isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier l'imprimeur" subtitle={editItem?.nom} emoji="🖨️">
        {editItem && <ImprimeurForm imprimeur={editItem} onClose={() => setEditItem(null)} />}
      </SlideOver>
    </div>
  )
}
