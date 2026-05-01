import { useState, useEffect, useRef } from 'react'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import type { PointDeVente } from './hooks/usePointsDeVente'
import { PointDeVenteForm } from './PointDeVenteForm'
import { CategoriesPDVManager } from './CategoriesPDVManager'
import { SimpleEntityCard } from '@/components/SimpleEntityCard'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import styles from '@/features/auteurs/AuteursPage.module.css'

export function PointsDeVentePage() {
  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [showCreate, setShowCreate]       = useState(false)
  const [editItem, setEditItem]           = useState<PointDeVente | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items, isLoading, isError } = usePointsDeVente(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Points de vente</h1>
          <p className={styles.subtitle}>{items?.length ?? '—'} point{(items?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={styles.btnSecondary} onClick={() => setShowCategories(true)}>Catégories</button>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouveau PDV</button>
        </div>
      </header>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}
      {isError && <div className={styles.empty}><p>Impossible de charger les points de vente.</p></div>}
      {!isLoading && !isError && items?.length === 0 && (
        <div className={styles.empty}><p>Aucun point de vente{debounced ? ` pour « ${debounced} »` : ''}.</p></div>
      )}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => {
            const commLines = [
              item.categorie?.nom ?? '',
              item.commissionFixe     ? `Fixe : ${Number(item.commissionFixe).toFixed(2)} €` : '',
              item.commissionPourcent ? `${Number(item.commissionPourcent)} %` : '',
              item.encaissementDirect ? 'Encaissement direct' : 'Via caisse PDV',
            ].filter(Boolean)
            return (
              <SimpleEntityCard
                key={item.id}
                nom={item.nom}
                icon="🏪"
                lines={commLines}
                onEdit={() => setEditItem(item)}
                centered
              />
            )
          })}
        </div>
      )}

      <Modal isOpen={showCategories} onClose={() => setShowCategories(false)} title="Catégories de points de vente" width={480}>
        <CategoriesPDVManager />
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau point de vente" width={getFormWidth('pointDeVente')}>
        <PointDeVenteForm onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier le point de vente" subtitle={editItem?.nom} width={getFormWidth('pointDeVente')}>
        {editItem && <PointDeVenteForm pointDeVente={editItem} onClose={() => setEditItem(null)} />}
      </Modal>
    </div>
  )
}
