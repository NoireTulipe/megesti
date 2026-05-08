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

// ── Mascottes tutoriel ────────────────────────────────────────────────────────

function MascotNoCategorie({ onOpenCategories }: { onOpenCategories: () => void }) {
  return (
    <div className={mascot['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={mascot['mascot-img']} />
      <div className={mascot['mascot-bubbles']}>

        <div className={mascot['mascot-bubble']}>
          <p className={mascot['mascot-title']}>Les points de vente, c'est quoi ? 🏪</p>
          <p className={mascot['mascot-text']}>
            Un <strong>point de vente</strong> est un lieu ou un canal où tu vas vendre tes
            produits — un stand dans un salon du livre, une librairie partenaire, ta propre
            boutique, un marché… Chaque point de vente a ses propres sessions de caisse,
            ses statistiques et son mode d'encaissement.
          </p>
        </div>

        <div className={mascot['mascot-bubble']}>
          <p className={mascot['mascot-text']}>
            Pour s'y retrouver, MeGesti organise tes points de vente en{' '}
            <strong>catégories</strong> — par exemple :{' '}
            <em>Salon littéraire, Librairie indépendante, Centre culturel, Festival, En ligne…</em>{' '}
            C'est toi qui les définis selon ton activité.
          </p>
          <p className={mascot['mascot-text']} style={{ marginTop: 8 }}>
            Commence par créer ta première catégorie, puis tu pourras y rattacher tes points de vente.
          </p>
          <button className={mascot['mascot-btn']} onClick={onOpenCategories}>
            Créer ma première catégorie →
          </button>
        </div>

      </div>
    </div>
  )
}

function MascotNoPDV({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className={mascot['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={mascot['mascot-img']} />
      <div className={mascot['mascot-bubbles']}>

        <div className={mascot['mascot-bubble']}>
          <p className={mascot['mascot-title']}>La première catégorie est là ! 🎉</p>
          <p className={mascot['mascot-text']}>
            Maintenant, ajoute ton <strong>premier point de vente</strong>. C'est lui que
            tu sélectionneras à chaque ouverture de session de caisse — MeGesti saura ainsi
            où se sont déroulées tes ventes et pourra te donner des{' '}
            <strong>statistiques par lieu</strong>, comparer tes performances d'un salon à
            l'autre et suivre tes encaissements avec précision.
          </p>
        </div>

        <div className={mascot['mascot-bubble']}>
          <p className={mascot['mascot-text']}>
            💡 <strong>Un détail important</strong> — lors de la création, tu devras choisir
            le mode d'encaissement :
          </p>
          <p className={mascot['mascot-text']} style={{ marginTop: 8 }}>
            🏪 <strong>Tu encaisses toi-même</strong> — tu prends directement les paiements
            (CB, espèces, chèque) lors du salon ou de l'événement.
          </p>
          <p className={mascot['mascot-text']} style={{ marginTop: 6 }}>
            🏬 <strong>Le point de vente encaisse</strong> — c'est le cas d'une librairie
            partenaire qui vend tes livres à ta place et te reverse ensuite ta part.
            MeGesti gère alors les commissions et les reversements.
          </p>
          <button className={mascot['mascot-btn']} onClick={onOpenCreate}>
            Ajouter mon premier point de vente →
          </button>
        </div>

      </div>
    </div>
  )
}

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
          <MascotNoCategorie onOpenCategories={() => setShowCategories(true)} />
        ) : (
          <MascotNoPDV onOpenCreate={() => setShowCreate(true)} />
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
