import { useState, useEffect, useRef } from 'react'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import type { PointDeVente } from './hooks/usePointsDeVente'
import { PointDeVenteCard }   from './PointDeVenteCard'
import { PointDeVenteDetail } from './PointDeVenteDetail'
import { PointDeVenteForm }   from './PointDeVenteForm'
import { CategoriesPDVManager } from './CategoriesPDVManager'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import sty from '@/features/auteurs/AuteursPage.module.css'

export function PointsDeVentePage() {
  const [search, setSearch]           = useState('')
  const [debounced, setDebounced]     = useState('')
  const [detail, setDetail]           = useState<PointDeVente | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [editItem, setEditItem]       = useState<PointDeVente | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = usePointsDeVente(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={sty.page}>

      {/* ── Header ── */}
      <header className={sty.header}>
        <div>
          <h1 className={sty['page-title']}>Points de vente</h1>
          <p className={sty['page-subtitle']}>
            {items.length} point{items.length > 1 ? 's' : ''}
            {debounced ? ` · résultats pour « ${debounced} »` : ''}
          </p>
        </div>
        <div className={sty['header-actions']}>
          <div className={sty['search-wrap']}>
            <span className={sty['search-icon']}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className={sty['search-input']}
              type="search"
              placeholder="Rechercher un PDV…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Bouton Catégories */}
          <button
            onClick={() => setShowCategories(true)}
            style={{
              height: 44, padding: '0 18px',
              background: 'transparent',
              border: '1.5px solid var(--cream-dark)',
              borderRadius: 'var(--r-pill)',
              fontSize: '0.875rem', fontWeight: 500,
              color: 'var(--text-soft)', cursor: 'pointer',
              transition: 'border-color var(--t), color var(--t)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--terra-light)'; e.currentTarget.style.color = 'var(--terra-dark)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cream-dark)'; e.currentTarget.style.color = 'var(--text-soft)' }}
          >
            Catégories
          </button>

          <button className={sty['btn-primary']} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau PDV
          </button>
        </div>
      </header>

      {/* ── Grille ── */}
      {isLoading && (
        <div className={sty.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={sty.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>🏪</div>
          <div className={sty['empty-title']}>Impossible de charger les points de vente</div>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className={sty['empty-state']}>
          <div className={sty['empty-icon']}>🏪</div>
          <div className={sty['empty-title']}>
            {debounced ? `Aucun résultat pour « ${debounced} »` : 'Aucun point de vente'}
          </div>
          <div className={sty['empty-desc']}>
            {!debounced && 'Ajoutez vos points de vente partenaires : salons, librairies, boutiques…'}
          </div>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className={sty.grid}>
          {items.map(item => (
            <PointDeVenteCard
              key={item.id}
              pdv={item}
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      )}

      {/* ── Fiche PDV ── */}
      {detail && (
        <PointDeVenteDetail
          pdv={detail}
          isOpen={Boolean(detail)}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditItem(detail); setDetail(null) }}
        />
      )}

      {/* ── Modales ── */}
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
