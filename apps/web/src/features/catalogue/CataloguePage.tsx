import { useState, useEffect, useRef } from 'react'
import { useArticles, useSetArticleActif } from './hooks/useArticles'
import { useRayons }   from './hooks/useRayons'
import { ArticleCard } from './ArticleCard'
import { ArticleForm } from './ArticleForm'
import { Modal }       from '@/components/ui/Modal'
import { EmptyState }  from '@/components/ui/EmptyState'
import type { Article } from './types'
import styles from './CataloguePage.module.css'

type CatalogueTab = 'actifs' | 'retires'

export function CataloguePage() {
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [activeRayon, setActiveRayon]   = useState<string | undefined>(undefined)
  const [tab, setTab]                   = useState<CatalogueTab>('actifs')
  const [showCreate, setShowCreate]     = useState(false)
  const [editArticle, setEditArticle]   = useState<Article | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: rayons = [] }                       = useRayons()
  const { data: articles = [], isLoading, isError } = useArticles(activeRayon, debouncedSearch || undefined, tab === 'actifs')
  const setActif = useSetArticleActif()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Catalogue</h1>
          <p className={styles.subtitle}>{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {tab === 'actifs' && (
            <button
              className={styles.btnPrimary}
              onClick={() => setShowCreate(true)}
              disabled={rayons.length === 0}
              title={rayons.length === 0 ? "Créez d'abord des rayons dans les Réglages" : undefined}
            >
              + Nouvel article
            </button>
          )}
        </div>
      </header>

      {/* Onglets En catalogue / Retirés */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'actifs' ? styles.tabActive : ''}`}
          onClick={() => setTab('actifs')}
        >
          En catalogue
        </button>
        <button
          className={`${styles.tab} ${tab === 'retires' ? styles.tabActive : ''}`}
          onClick={() => setTab('retires')}
        >
          Retirés
        </button>
      </div>

      {/* Filtres rayons */}
      {rayons.length > 0 && (
        <nav className={styles.rayonNav}>
          <button
            className={`${styles.rayonTab} ${!activeRayon ? styles.rayonTabActive : ''}`}
            onClick={() => setActiveRayon(undefined)}
          >
            Tous
          </button>
          {rayons.map((r) => (
            <button
              key={r.id}
              className={`${styles.rayonTab} ${activeRayon === r.id ? styles.rayonTabActive : ''}`}
              onClick={() => setActiveRayon(r.id)}
            >
              {r.nom}
            </button>
          ))}
        </nav>
      )}

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={styles.empty}><p>Impossible de charger le catalogue.</p></div>
      )}

      {!isLoading && !isError && articles.length === 0 && (
        <EmptyState
          emoji={rayons.length === 0 ? '⚙️' : '📚'}
          title={
            rayons.length === 0
              ? 'Commencez par créer vos rayons'
              : debouncedSearch
                ? `Aucun résultat pour « ${debouncedSearch} »`
                : tab === 'retires'
                  ? 'Aucun article retiré'
                  : 'Votre catalogue est vide'
          }
          description={
            rayons.length === 0
              ? 'Rendez-vous dans les Réglages → Rayons pour structurer votre catalogue.'
              : debouncedSearch ? undefined
              : tab === 'actifs' ? 'Ajoutez votre premier livre, goodie ou article.'
              : undefined
          }
          action={
            rayons.length === 0
              ? undefined
              : debouncedSearch ? undefined
              : tab === 'actifs' ? { label: '+ Nouvel article', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      )}

      {!isLoading && !isError && articles.length > 0 && (
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={tab === 'actifs' ? () => setEditArticle(article) : undefined}
              onToggle={(actif) => setActif.mutate({ id: article.id, actif })}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel article" size="xl">
        <ArticleForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={Boolean(editArticle)} onClose={() => setEditArticle(null)} title="Modifier l'article" subtitle={editArticle?.nom} size="xl">
        {editArticle && <ArticleForm article={editArticle} onClose={() => setEditArticle(null)} />}
      </Modal>
    </div>
  )
}
