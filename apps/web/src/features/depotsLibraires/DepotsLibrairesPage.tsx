import { useState, useEffect, useRef } from 'react'
import { useDepotsLibraires } from './hooks/useDepotsLibraires'
import type { DepotLibraireList } from './hooks/useDepotsLibraires'
import { DepotLibraireCard }   from './DepotLibraireCard'
import { DepotLibraireDetail } from './DepotLibraireDetail'
import { Modal } from '@/components/ui/Modal'
import { DepotLibraireForm }   from './DepotLibraireForm'
import { PageHero } from '@/components/PageHero'
import { SearchInput } from '@/components/SearchInput'
import { MascoteBlock } from '@/components/MascoteBlock'
import sty from '@/features/auteurs/AuteursPage.module.css'

export function DepotsLibrairesPage() {
  const [search, setSearch]           = useState('')
  const [debounced, setDebounced]     = useState('')
  const [detail, setDetail]           = useState<DepotLibraireList | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [editDepot, setEditDepot]     = useState<DepotLibraireList | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useDepotsLibraires(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={sty.page}>
      <PageHero
        title="Dépôts libraires"
        subtitle={<>{items.length} dépôt{items.length > 1 ? 's' : ''} référencé{items.length > 1 ? 's' : ''}{debounced ? ` · résultats pour « ${debounced} »` : ''}</>}
      >
        <div className={sty['header-actions']}>
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => { setSearch(''); setDebounced('') }}
            placeholder="Rechercher un dépôt…"
          />
          <button className={sty['btn-primary']} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau dépôt
          </button>
        </div>
      </PageHero>

      {isLoading && (
        <div className={sty.grid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={sty.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>📦</div>
          <div className={sty['empty-title']}>Impossible de charger les dépôts</div>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && debounced && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>📦</div>
          <div className={sty['empty-title']}>Aucun résultat pour « {debounced} »</div>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && !debounced && (
        <MascoteBlock
          slug="depots-vide"
          onCta={() => setShowCreate(true)}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className={`${sty.grid} stagger`}>
          {items.map(item => (
            <DepotLibraireCard
              key={item.id}
              depot={item}
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      )}

      {detail && (
        <DepotLibraireDetail
          depot={detail}
          isOpen={Boolean(detail)}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditDepot(detail); setDetail(null) }}
        />
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau dépôt libraire" subtitle="Librairie partenaire en dépôt-vente" size="lg">
        <DepotLibraireForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={Boolean(editDepot)} onClose={() => setEditDepot(null)} title="Modifier le dépôt" subtitle={editDepot?.nom} size="lg">
        {editDepot && <DepotLibraireForm depotLibraire={editDepot} onClose={() => setEditDepot(null)} />}
      </Modal>
    </div>
  )
}
