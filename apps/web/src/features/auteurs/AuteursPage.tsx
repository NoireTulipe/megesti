import { useState, useEffect, useRef } from 'react'
import { useAuteurs } from './hooks/useAuteurs'
import type { Auteur } from './hooks/useAuteurs'
import { AuteurCard } from './AuteurCard'
import { AuteurForm } from './AuteurForm'
import { AuteurDetail } from './AuteurDetail'
import { Modal } from '@/components/ui/Modal'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { HelpButton } from '@/components/HelpButton'
import styles from './AuteursPage.module.css'

type AuteurTab = 'me' | 'reseau'

export function AuteursPage() {
  const { features } = usePlanFeatures()
  const reseauOnly   = features.auteurs === 'reseau'

  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [tab, setTab]                   = useState<AuteurTab>(reseauOnly ? 'reseau' : 'me')
  const [showCreate, setShowCreate]     = useState(false)
  const [detailAuteur, setDetailAuteur] = useState<Auteur | null>(null)
  const [editAuteur, setEditAuteur]     = useState<Auteur | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: auteurs = [], isLoading, isError } = useAuteurs({
    q: debouncedSearch || undefined,
    avecContrat: tab === 'me',
  })

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles['page-title']}>Auteurs</h1>
            <p className={styles['page-subtitle']}>
              {auteurs.length} auteur{auteurs.length !== 1 ? 's' : ''}
              {debouncedSearch ? ` · résultats pour « ${debouncedSearch} »` : ''}
            </p>
          </div>
          <div className={styles['header-actions']}>
            <div className={styles['search-wrap']}>
              <span className={styles['search-icon']}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                className={styles['search-input']}
                type="search"
                placeholder="Rechercher un auteur…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className={styles['btn-primary']} onClick={() => setShowCreate(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvel auteur
            </button>
          </div>
        </header>

        <div className={styles['tab-bar']} style={{ alignItems: 'center' }}>
            <button
              className={`${styles['tab-btn']} ${tab === 'me' ? styles.active : ''}`}
              onClick={() => !reseauOnly && setTab('me')}
              disabled={reseauOnly}
              title={reseauOnly ? 'La gestion complète des auteurs est disponible à partir du plan Edition.' : undefined}
              style={reseauOnly ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Auteurs ME
            </button>
            <button
              className={`${styles['tab-btn']} ${tab === 'reseau' ? styles.active : ''}`}
              onClick={() => setTab('reseau')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1-4-10z"/>
              </svg>
              Réseau
            </button>
          <HelpButton slug="aide-auteur-switch" className={styles['tab-help']} />
        </div>

        {isLoading && (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {isError && (
          <div className={styles['empty-state']}>
            <div className={styles['empty-icon']}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles['empty-title']}>Impossible de charger les auteurs</div>
          </div>
        )}

        {!isLoading && !isError && auteurs.length === 0 && (
          <div className={styles['empty-state']}>
            <div className={styles['empty-icon']}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4907C" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles['empty-title']}>
              {debouncedSearch
                ? `Aucun résultat pour « ${debouncedSearch} »`
                : tab === 'me' ? 'Aucun auteur sous contrat' : 'Aucun auteur dans le réseau'}
            </div>
            <div className={styles['empty-desc']}>
              {!debouncedSearch && (tab === 'me'
                ? 'Créez un auteur puis ajoutez-lui un contrat depuis sa fiche.'
                : 'Référencez ici les auteurs avec qui vous collaborez.')}
            </div>
          </div>
        )}

        {!isLoading && !isError && auteurs.length > 0 && (
          <div className={styles.grid}>
            {auteurs.map(auteur => (
              <AuteurCard
                key={auteur.id}
                auteur={auteur}
                onClick={() => setDetailAuteur(auteur)}
              />
            ))}
          </div>
        )}

        {detailAuteur && (
          <AuteurDetail
            auteur={detailAuteur}
            isOpen={Boolean(detailAuteur)}
            onClose={() => setDetailAuteur(null)}
            onEdit={() => { setEditAuteur(detailAuteur); setDetailAuteur(null) }}
          />
        )}

        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Nouvel auteur"
          subtitle="Référencez un auteur ou un contributeur"
          size="lg"
        >
          <AuteurForm onClose={() => { setShowCreate(false); setTab('reseau') }} />
        </Modal>

        <Modal
          isOpen={Boolean(editAuteur)}
          onClose={() => setEditAuteur(null)}
          title="Modifier l'auteur"
          subtitle={editAuteur ? `${editAuteur.prenom} ${editAuteur.nom}` : ''}
          size="lg"
        >
          {editAuteur && <AuteurForm auteur={editAuteur} onClose={() => setEditAuteur(null)} />}
        </Modal>
      </div>
  )
}
