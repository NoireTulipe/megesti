import { useState, useEffect, useRef } from 'react'
import { useAuteurs } from './hooks/useAuteurs'
import type { Auteur } from './hooks/useAuteurs'
import { AuteurCard } from './AuteurCard'
import { AuteurForm } from './AuteurForm'
import { Modal } from '@/components/ui/Modal'
import { getFormWidth } from '@/lib/formWidth'
import styles from './AuteursPage.module.css'

type AuteurTab = 'me' | 'reseau'

export function AuteursPage() {
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [tab, setTab]                   = useState<AuteurTab>('me')
  const [showCreate, setShowCreate]     = useState(false)
  const [editAuteur, setEditAuteur]     = useState<Auteur | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avecContrat = tab === 'me' ? true : false
  const { data: auteurs, isLoading, isError } = useAuteurs({
    q: debouncedSearch || undefined,
    avecContrat,
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
          <p className={styles.subtitle}>{auteurs?.length ?? '—'} auteur{(auteurs?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            + Nouvel auteur
          </button>
        </div>
      </header>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'me' ? styles.tabActive : ''}`}
          onClick={() => setTab('me')}
        >
          Auteurs ME
        </button>
        <button
          className={`${styles.tab} ${tab === 'reseau' ? styles.tabActive : ''}`}
          onClick={() => setTab('reseau')}
        >
          Réseau
        </button>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && <div className={styles.empty}><p>Impossible de charger les auteurs.</p></div>}

      {!isLoading && !isError && auteurs?.length === 0 && (
        <div className={styles.empty}>
          <p>
            {tab === 'me'
              ? `Aucun auteur ME${debouncedSearch ? ` pour « ${debouncedSearch} »` : ''} — créez des contrats depuis la fiche auteur.`
              : `Aucun auteur réseau${debouncedSearch ? ` pour « ${debouncedSearch} »` : ''}.`}
          </p>
        </div>
      )}

      {!isLoading && !isError && auteurs && auteurs.length > 0 && (
        <div className={styles.grid}>
          {auteurs.map((auteur) => (
            <AuteurCard
              key={auteur.id}
              auteur={auteur}
              onEdit={() => setEditAuteur(auteur)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel auteur" width={getFormWidth('auteur')}>
        <AuteurForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal
        isOpen={Boolean(editAuteur)}
        onClose={() => setEditAuteur(null)}
        title="Modifier l'auteur"
        subtitle={editAuteur ? `${editAuteur.prenom} ${editAuteur.nom}` : ''}
        width={getFormWidth('auteur')}
      >
        {editAuteur && (
          <AuteurForm auteur={editAuteur} onClose={() => setEditAuteur(null)} />
        )}
      </Modal>
    </div>
  )
}
