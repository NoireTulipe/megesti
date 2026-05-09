import { useState, useEffect, useRef } from 'react'
import { useMaisonsEdition } from './hooks/useMaisonsEdition'
import type { MaisonEdition } from './hooks/useMaisonsEdition'
import { MaisonEditionCard } from './MaisonEditionCard'
import { MaisonEditionForm } from './MaisonEditionForm'
import { Modal } from '@/components/ui/Modal'
import styles from './MaisonsEditionPage.module.css'

function MascotNoMaison({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles['mascot-wrap']}>
      <img src="/img/mascotte/m1.png" alt="" className={styles['mascot-img']} />
      <div className={styles['mascot-bubbles']}>

        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-title']}>Ton carnet de maisons d'édition ! 📚</p>
          <p className={styles['mascot-text']}>
            Ici, tu recenses les <strong>maisons d'édition partenaires</strong> ou celles
            que tu surveilles de près — concurrentes, complémentaires, distributeurs
            communs, coéditrices potentielles… C'est la mémoire de ton{' '}
            <strong>réseau professionnel éditorial</strong>.
          </p>
        </div>

        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-text']}>
            Pour chaque maison, tu notes ses <strong>contacts clés</strong>, son
            adresse, son site, ses spécialités… Plus besoin de chercher un numéro
            de téléphone en plein salon quand on n'a pas le temps. Tout est là,
            à portée de clic.
          </p>
        </div>

        <div className={styles['mascot-bubble']}>
          <p className={styles['mascot-text']}>
            Ce carnet prend de la valeur avec le temps. Un bon{' '}
            <strong>réseau éditorial</strong> ouvre des portes : coéditions,
            co-stands en salon, échanges de bons procédés, recommandations
            croisées… Commence à le constituer dès maintenant, même avec
            une seule fiche.
          </p>
          <button className={styles['mascot-btn']} onClick={onAdd}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter une maison d'édition →
          </button>
        </div>

      </div>
    </div>
  )
}

export function MaisonsEditionPage() {
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem]     = useState<MaisonEdition | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: items = [], isLoading, isError } = useMaisonsEdition(debounced || undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  function handleClose() {
    setShowCreate(false)
    setEditItem(null)
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Maisons d'édition</h1>
          <p className={styles.pageSubtitle}>
            {items.length} maison{items.length !== 1 ? 's' : ''}
            {debounced ? ` · résultats pour « ${debounced} »` : ''}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle maison
          </button>
        </div>
      </header>

      {/* ── Loader ── */}
      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {/* ── Erreur ── */}
      {isError && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className={styles.emptyTitle}>Impossible de charger les maisons d'édition</div>
        </div>
      )}

      {/* ── Vide ── */}
      {!isLoading && !isError && items.length === 0 && (
        debounced ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div className={styles.emptyTitle}>Aucun résultat pour « {debounced} »</div>
          </div>
        ) : (
          <MascotNoMaison onAdd={() => setShowCreate(true)} />
        )
      )}

      {/* ── Grille ── */}
      {!isLoading && !isError && items.length > 0 && (
        <div className={styles.grid}>
          {items.map(item => (
            <MaisonEditionCard
              key={item.id}
              item={item}
              active={editItem?.id === item.id}
              onClick={() => setEditItem(item)}
            />
          ))}
        </div>
      )}

      {/* ── Modale création ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle maison d'édition"
        subtitle="Ajoutez un partenaire éditorial"
        size="lg"
      >
        <MaisonEditionForm onClose={handleClose} />
      </Modal>

      {/* ── Modale édition ── */}
      <Modal
        isOpen={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Modifier la maison"
        subtitle={editItem?.nom}
        size="lg"
      >
        {editItem && <MaisonEditionForm maisonEdition={editItem} onClose={handleClose} />}
      </Modal>
    </div>
  )
}
