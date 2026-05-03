import { useState, useEffect, useRef } from 'react'
import { useArticles, useSetArticleActif } from './hooks/useArticles'
import { useRayons } from './hooks/useRayons'
import { ArticleCard }   from './ArticleCard'
import { ArticleDetail } from './ArticleDetail'
import { ArticleForm }   from './ArticleForm'
import { Modal }         from '@/components/ui/Modal'
import type { Article }  from './types'
import styles from './CataloguePage.module.css'

type CatalogueTab = 'actifs' | 'retires'

export function CataloguePage() {
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [activeRayon, setActiveRayon] = useState<string | undefined>(undefined)
  const [tab, setTab]                 = useState<CatalogueTab>('actifs')
  const [detailArticle, setDetail]    = useState<Article | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
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

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles['page-title']}>Catalogue</h1>
          <p className={styles['page-subtitle']}>
            {articles.length} article{articles.length !== 1 ? 's' : ''}
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
              placeholder="Rechercher un article…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {tab === 'actifs' && (
            <button
              className={styles['btn-primary']}
              onClick={() => setShowCreate(true)}
              disabled={rayons.length === 0}
              title={rayons.length === 0 ? "Créez d'abord des rayons dans les Réglages" : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvel article
            </button>
          )}
        </div>
      </header>

      {/* ── Onglets ── */}
      <div className={styles['tab-bar']}>
        <button
          className={`${styles['tab-btn']} ${tab === 'actifs' ? styles.active : ''}`}
          onClick={() => setTab('actifs')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          En catalogue
        </button>
        <button
          className={`${styles['tab-btn']} ${tab === 'retires' ? styles.active : ''}`}
          onClick={() => setTab('retires')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
          Retirés
        </button>
      </div>

      {/* ── Filtres rayons ── */}
      {rayons.length > 0 && (
        <nav className={styles['rayon-nav']}>
          <button
            className={`${styles['rayon-btn']} ${!activeRayon ? styles.active : ''}`}
            onClick={() => setActiveRayon(undefined)}
          >
            Tous
          </button>
          {rayons.map(r => (
            <button
              key={r.id}
              className={`${styles['rayon-btn']} ${activeRayon === r.id ? styles.active : ''}`}
              onClick={() => setActiveRayon(r.id)}
            >
              {r.nom}
            </button>
          ))}
        </nav>
      )}

      {/* ── Grille ── */}
      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {isError && (
        <div className={styles['empty-state']}>
          <div className={styles['empty-icon']}>📚</div>
          <div className={styles['empty-title']}>Impossible de charger le catalogue</div>
        </div>
      )}

      {!isLoading && !isError && articles.length === 0 && (
        <div className={styles['empty-state']}>
          <div className={styles['empty-icon']}>{rayons.length === 0 ? '⚙️' : '📚'}</div>
          <div className={styles['empty-title']}>
            {rayons.length === 0
              ? 'Commencez par créer vos rayons'
              : debouncedSearch
                ? `Aucun résultat pour « ${debouncedSearch} »`
                : tab === 'retires' ? 'Aucun article retiré' : 'Votre catalogue est vide'}
          </div>
          <div className={styles['empty-desc']}>
            {rayons.length === 0
              ? 'Rendez-vous dans les Réglages → Rayons pour structurer votre catalogue.'
              : !debouncedSearch && tab === 'actifs'
                ? 'Ajoutez votre premier livre, goodie ou article.'
                : ''}
          </div>
        </div>
      )}

      {!isLoading && !isError && articles.length > 0 && (
        <div className={styles.grid}>
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={tab === 'actifs' ? () => setEditArticle(article) : undefined}
              onToggle={actif => setActif.mutate({ id: article.id, actif })}
              onClick={() => setDetail(article)}
            />
          ))}
        </div>
      )}

      {/* ── Fiche article ── */}
      {detailArticle && (
        <ArticleDetail
          article={detailArticle}
          isOpen={Boolean(detailArticle)}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditArticle(detailArticle); setDetail(null) }}
          onToggle={actif => setActif.mutate({ id: detailArticle.id, actif })}
        />
      )}

      {/* ── Modales formulaire ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel article" size="xl">
        <ArticleForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={Boolean(editArticle)} onClose={() => setEditArticle(null)} title="Modifier l'article" subtitle={editArticle?.nom} size="xl">
        {editArticle && <ArticleForm article={editArticle} onClose={() => setEditArticle(null)} />}
      </Modal>
    </div>
  )
}
