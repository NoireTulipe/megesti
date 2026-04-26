import { useState, useEffect, useRef } from 'react'
import { useMaisonsEdition } from './hooks/useMaisonsEdition'
import type { MaisonEdition } from './hooks/useMaisonsEdition'
import { MaisonEditionForm } from './MaisonEditionForm'
import { SimpleEntityCard } from '@/components/SimpleEntityCard'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import styles from '@/features/auteurs/AuteursPage.module.css'

export function MaisonsEditionPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]   = useState<MaisonEdition | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items, isLoading, isError } = useMaisonsEdition(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Maisons d'édition</h1>
          <p className={styles.subtitle}>{items?.length ?? '—'} maison{(items?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouvelle maison</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}
      {isError && <div className={styles.empty}><p>Impossible de charger les maisons d'édition.</p></div>}
      {!isLoading && !isError && items?.length === 0 && (
        <div className={styles.empty}><p>Aucune maison d'édition{debounced ? ` pour « ${debounced} »` : ''}.</p></div>
      )}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => (
            <SimpleEntityCard
              key={item.id}
              nom={item.nom}
              icon="🏛️"
              lines={[item.siret ?? '', item.email ?? '', item.telephone ?? ''].filter(Boolean)}
              onEdit={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle maison d'édition" width={getFormWidth('maisonEdition')}>
        <MaisonEditionForm onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier la maison d'édition" subtitle={editItem?.nom} width={getFormWidth('maisonEdition')}>
        {editItem && <MaisonEditionForm maisonEdition={editItem} onClose={() => setEditItem(null)} />}
      </Modal>
    </div>
  )
}
