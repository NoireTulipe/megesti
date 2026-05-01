import { useState, useEffect, useRef } from 'react'
import { useAuteurs } from './hooks/useAuteurs'
import type { Auteur } from './hooks/useAuteurs'
import { AuteurCard } from './AuteurCard'
import { AuteurForm } from './AuteurForm'
import { AuteurDetail } from './AuteurDetail'
import { SlideOver } from '@/components/ui/SlideOver'
import { EmptyState } from '@/components/ui/EmptyState'
import styles from './AuteursPage.module.css'

type AuteurTab = 'me' | 'reseau'

export function AuteursPage() {
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [tab, setTab]                     = useState<AuteurTab>('me')
  const [showCreate, setShowCreate]       = useState(false)
  const [detailAuteur, setDetailAuteur]   = useState<Auteur | null>(null)
  const [editAuteur, setEditAuteur]       = useState<Auteur | null>(null)
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
          <h1 className={styles.title}>Auteurs</h1>
          <p className={styles.subtitle}>{auteurs.length} auteur{auteurs.length > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouvel auteur</button>
        </div>
      </header>

      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${tab === 'me' ? styles.tabActive : ''}`} onClick={() => setTab('me')}>
          ✍️ Auteurs ME
        </button>
        <button className={`${styles.tab} ${tab === 'reseau' ? styles.tabActive : ''}`} onClick={() => setTab('reseau')}>
          🌐 Réseau
        </button>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && <div className={styles.empty}><p>Impossible de charger les auteurs.</p></div>}

      {!isLoading && !isError && auteurs.length === 0 && (
        <EmptyState
          emoji="✍️"
          title={
            debouncedSearch
              ? `Aucun résultat pour « ${debouncedSearch} »`
              : tab === 'me'
                ? 'Aucun auteur sous contrat'
                : 'Aucun auteur dans le réseau'
          }
          description={
            debouncedSearch ? undefined : tab === 'me'
              ? 'Créez un auteur puis ajoutez-lui un contrat depuis sa fiche.'
              : 'Référencez ici les auteurs avec qui vous avez travaillé ou souhaitez collaborer.'
          }
          action={debouncedSearch ? undefined : { label: '+ Nouvel auteur', onClick: () => setShowCreate(true) }}
        />
      )}

      {!isLoading && !isError && auteurs.length > 0 && (
        <div className={styles.grid}>
          {auteurs.map(auteur => (
            <AuteurCard
              key={auteur.id}
              auteur={auteur}
              onClick={() => setDetailAuteur(auteur)}
              onEdit={() => setEditAuteur(auteur)}
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

      <SlideOver isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel auteur" emoji="✍️">
        <AuteurForm onClose={() => { setShowCreate(false); setTab('reseau') }} />
      </SlideOver>

      <SlideOver
        isOpen={Boolean(editAuteur)}
        onClose={() => setEditAuteur(null)}
        title="Modifier l'auteur"
        subtitle={editAuteur ? `${editAuteur.prenom} ${editAuteur.nom}` : ''}
        emoji="✍️"
      >
        {editAuteur && <AuteurForm auteur={editAuteur} onClose={() => setEditAuteur(null)} />}
      </SlideOver>
    </div>
  )
}
