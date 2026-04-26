import { useState, useEffect, useRef } from 'react'
import { useSalons } from './hooks/useSalons'
import type { Salon } from './hooks/useSalons'
import { SalonForm } from './SalonForm'
import { SimpleEntityCard } from '@/components/SimpleEntityCard'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import styles from '@/features/auteurs/AuteursPage.module.css'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SalonsPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]   = useState<Salon | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items, isLoading, isError } = useSalons(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Salons</h1>
          <p className={styles.subtitle}>{items?.length ?? '—'} salon{(items?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouveau salon</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}
      {isError && <div className={styles.empty}><p>Impossible de charger les salons.</p></div>}
      {!isLoading && !isError && items?.length === 0 && (
        <div className={styles.empty}><p>Aucun salon{debounced ? ` pour « ${debounced} »` : ''}.</p></div>
      )}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => {
            const dates = [formatDate(item.dateDebut), formatDate(item.dateFin)].filter(Boolean).join(' → ')
            return (
              <SimpleEntityCard
                key={item.id}
                nom={item.nom}
                icon="🎪"
                lines={[item.lieu ?? '', dates].filter(Boolean)}
                onEdit={() => setEditItem(item)}
              />
            )
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau salon" width={getFormWidth('salon')}>
        <SalonForm onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier le salon" subtitle={editItem?.nom} width={getFormWidth('salon')}>
        {editItem && <SalonForm salon={editItem} onClose={() => setEditItem(null)} />}
      </Modal>
    </div>
  )
}
