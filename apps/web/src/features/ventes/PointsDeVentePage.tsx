import { useState, useEffect, useRef } from 'react'
import { usePointsDeVente } from './hooks/usePointsDeVente'
import type { PointDeVente } from './hooks/usePointsDeVente'
import { useCategoriesPointDeVente } from './hooks/useCategoriesPointDeVente'
import { PointDeVenteCard }    from './PointDeVenteCard'
import { PointDeVenteDetail }  from './PointDeVenteDetail'
import { PointDeVenteForm }    from './PointDeVenteForm'
import { CategoriesPDVManager } from './CategoriesPDVManager'
import { Modal }               from '@/components/ui/Modal'
import { getFormWidth }        from '@/lib/formWidth'
import sty    from '@/features/auteurs/AuteursPage.module.css'
import mascot from './PointsDeVentePage.module.css'
import { MascoteBlock } from '@/components/MascoteBlock'

// ── Page principale ───────────────────────────────────────────────────────────

export function PointsDeVentePage() {
  const [search, setSearch]           = useState('')
  const [debounced, setDebounced]     = useState('')
  const [detail, setDetail]           = useState<PointDeVente | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [editItem, setEditItem]       = useState<PointDeVente | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items      = [], isLoading, isError } = usePointsDeVente(debounced || undefined)
  const { data: categories = [] }                     = useCategoriesPointDeVente()

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
          <button className={mascot['btn-categories']} onClick={() => setShowCategories(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            Catégories
          </button>

          {/* Bouton Nouveau PDV — désactivé si aucune catégorie */}
          <button
            className={sty['btn-primary']}
            onClick={() => setShowCreate(true)}
            disabled={categories.length === 0}
            title={categories.length === 0 ? 'Créez d\'abord une catégorie de point de vente' : undefined}
            style={categories.length === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau PDV
          </button>
        </div>
      </header>

      {/* ── Grille / Mascottes ── */}
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

      {!isLoading && !isError && (
        items.length > 0 ? (
          <div className={sty.grid}>
            {items.map(item => (
              <PointDeVenteCard key={item.id} pdv={item} onClick={() => setDetail(item)} />
            ))}
          </div>
        ) : debounced ? (
          <div className={sty['empty-state']}>
            <div className={sty['empty-icon']}>🏪</div>
            <div className={sty['empty-title']}>Aucun résultat pour « {debounced} »</div>
          </div>
        ) : categories.length === 0 ? (
          <MascoteBlock slug="pdv-no-categorie" onCta={() => setShowCategories(true)} />
        ) : (
          <MascoteBlock slug="pdv-no-pdv" onCta={() => setShowCreate(true)} />
        )
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
