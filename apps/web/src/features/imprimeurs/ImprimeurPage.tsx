import { useState, useEffect, useRef } from 'react'
import { useImprimeurs } from './hooks/useImprimeurs'
import type { Imprimeur } from './hooks/useImprimeurs'
import { ImprimeurCard }   from './ImprimeurCard'
import { ImprimeurDetail } from './ImprimeurDetail'
import { ImprimeurForm }   from './ImprimeurForm'
import { Modal } from '@/components/ui/Modal'
import { PageHero } from '@/components/PageHero'
import { SearchInput } from '@/components/SearchInput'
import sty from '@/features/auteurs/AuteursPage.module.css'

export function ImprimeurPage() {
  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [detail, setDetail]         = useState<Imprimeur | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]     = useState<Imprimeur | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useImprimeurs(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={sty.page}>

      <PageHero
        title="Imprimeurs"
        subtitle={<>{items.length} imprimeur{items.length > 1 ? 's' : ''} référencé{items.length > 1 ? 's' : ''}{debounced ? ` · résultats pour « ${debounced} »` : ''}</>}
      >
        <div className={sty['header-actions']}>
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => { setSearch(''); setDebounced('') }}
            placeholder="Rechercher un imprimeur…"
          />
          <button className={sty['btn-primary']} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvel imprimeur
          </button>
        </div>
      </PageHero>

      {/* ── Grille ── */}
      {isLoading && (
        <div className={sty.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={sty.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>🖨️</div>
          <div className={sty['empty-title']}>Impossible de charger les imprimeurs</div>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>🖨️</div>
          <div className={sty['empty-title']}>
            {debounced ? `Aucun résultat pour « ${debounced} »` : 'Aucun imprimeur référencé'}
          </div>
          <div className={sty['empty-desc']}>
            {!debounced && 'Ajoutez vos imprimeurs pour les retrouver en un clic depuis chaque livre.'}
          </div>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className={`${sty.grid} stagger`}>
          {items.map(item => (
            <ImprimeurCard
              key={item.id}
              imprimeur={item}
              onClick={() => setDetail(item)}
              onEdit={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      {/* ── Fiche imprimeur ── */}
      {detail && (
        <ImprimeurDetail
          imprimeur={detail}
          isOpen={Boolean(detail)}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditItem(detail); setDetail(null) }}
        />
      )}

      {/* ── Modales formulaire ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel imprimeur" size="lg">
        <ImprimeurForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={Boolean(editItem)} onClose={() => setEditItem(null)} title="Modifier l'imprimeur" subtitle={editItem?.nom} size="lg">
        {editItem && <ImprimeurForm imprimeur={editItem} onClose={() => setEditItem(null)} />}
      </Modal>
    </div>
  )
}
