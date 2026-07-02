import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArticles, useSetArticleActif } from './hooks/useArticles'
import { useRayons } from './hooks/useRayons'
import { ArticleCard }   from './ArticleCard'
import { ArticleDetail } from './ArticleDetail'
import { ArticleForm }   from './ArticleForm'
import { Modal }         from '@/components/ui/Modal'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import type { Article }  from './types'
import styles from './CataloguePage.module.css'

import { MascoteBlock } from '@/components/MascoteBlock'
import { PageHero } from '@/components/PageHero'
import { SearchInput } from '@/components/SearchInput'
import { HelpButton } from '@/components/HelpButton'

type CatalogueTab = 'actifs' | 'retires'

// ── Compteur de quota articles ────────────────────────────────────────────────

function ArticleQuota({ used, max }: { used: number; max: number | null }) {
  if (max === null) {
    return (
      <div className={styles['quota-unlimited']}>
        <span className={styles['quota-inf']}>∞</span>
        <span className={styles['quota-inf-label']}>illimité</span>
      </div>
    )
  }

  const pct       = Math.min(used / max, 1)
  const remaining = max - used
  const r         = 14
  const circ      = 2 * Math.PI * r
  const offset    = circ * (1 - pct)
  const color     = pct >= 0.9 ? '#C85D3A' : pct >= 0.7 ? '#C9933A' : '#6B8F71'
  const bgColor   = pct >= 0.9 ? '#FCF0EC' : pct >= 0.7 ? '#FBF5E6' : '#EDF4EE'

  return (
    <div className={styles['quota-ring']} style={{ background: bgColor, borderColor: color + '40' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        {/* Piste de fond */}
        <circle cx="20" cy="20" r={r} fill="none" stroke={color + '22'} strokeWidth="4" />
        {/* Arc de progression */}
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.3s' }}
        />
        {/* Chiffre central */}
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central"
          fontSize="9.5" fontWeight="800" fill={color} fontFamily="inherit">
          {used}
        </text>
      </svg>
      <div className={styles['quota-info']}>
        <span className={styles['quota-remaining']} style={{ color }}>
          {remaining > 0 ? `${remaining} restant${remaining > 1 ? 's' : ''}` : 'Quota atteint'}
        </span>
        <span className={styles['quota-total']}>sur {max} articles</span>
      </div>
      <HelpButton slug="aide-auteur-quota" className={styles['tab-help']} />
    </div>
  )
}

export function CataloguePage() {
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [activeRayon, setActiveRayon] = useState<string | undefined>(undefined)
  const [tab, setTab]                 = useState<CatalogueTab>('actifs')
  const [detailArticle, setDetail]    = useState<Article | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { features }                                = usePlanFeatures()
  const { data: rayons = [] }                       = useRayons()
  const { data: articles = [], isLoading, isError } = useArticles(activeRayon, debouncedSearch || undefined, tab === 'actifs')
  const { data: allActifs = [] }                    = useArticles(undefined, undefined, true, true) // pour le quota (MP exclues)
  const setActif = useSetArticleActif()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(search), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  return (
    <div className={styles.page}>

      <PageHero
        title="Catalogue"
        subtitle={<>{articles.length} article{articles.length !== 1 ? 's' : ''}{debouncedSearch ? ` · résultats pour « ${debouncedSearch} »` : ''}</>}
      >
        <div className={styles['header-actions']}>
          {tab === 'actifs' && (
            <ArticleQuota used={allActifs.length} max={features.maxArticles} />
          )}
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => { setSearch(''); setDebounced('') }}
            placeholder="🔍  Rechercher…"
          />
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
      </PageHero>

      {/* ── Onglets ── */}
      <div className={styles['tab-bar']}  style={{ alignItems: 'center' }}>
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
        <HelpButton slug="aide-catalogue-switch" className={styles['tab-help']} />
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
        rayons.length === 0 ? (
          <MascoteBlock slug="catalogue-no-rayon" />
        ) : !debouncedSearch && tab === 'actifs' ? (
          <MascoteBlock slug="catalogue-no-article" onCta={() => setShowCreate(true)} />
        ) : !debouncedSearch && tab === 'retires' ? (
          <MascoteBlock slug="catalogue-retires-vide" />
        ) : (
          <div className={styles['empty-state']}>
            <div className={styles['empty-icon']}>📚</div>
            <div className={styles['empty-title']}>
              Aucun résultat pour « {debouncedSearch} »
            </div>
          </div>
        )
      )}

      {!isLoading && !isError && articles.length > 0 && (
        <div className={`${styles.grid} stagger`}>
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

      {/* ── Rappel discret rayons (catalogue non vide, sans recherche active) ── */}
      {allActifs.length > 0 && tab === 'actifs' && !debouncedSearch && (
        <MascoteBlock slug="catalogue-lien-rayons" />
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
