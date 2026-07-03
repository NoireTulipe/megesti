import { useState, useMemo } from 'react'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useRayons }   from '@/features/catalogue/hooks/useRayons'
import { RayonNav, useRayonFilter } from '@/features/catalogue/RayonNav'
import { AjustementStock }      from './AjustementStock'
import { HistoriqueMouvements } from './HistoriqueMouvements'
import { StockHistoriqueModal } from './StockHistoriqueModal'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import type { Article } from '@/features/catalogue/types'
import { PageHero } from '@/components/PageHero'
import { SearchInput } from '@/components/SearchInput'
import styles from './StockPage.module.css'

type StockTab    = 'stocks' | 'historique'
type StockStatus = 'alerte' | 'tension' | 'ok'
type TypeFilter  = 'all' | 'articles' | 'mp'

function getStatus(a: Article): StockStatus {
  if (a.stock <= a.stockAlerte)  return 'alerte'
  if (a.stock <= a.stockTension) return 'tension'
  return 'ok'
}

const STATUS_LABEL: Record<StockStatus, string> = { alerte:'Alerte', tension:'Attention', ok:'OK' }
const STATUS_COLOR: Record<StockStatus, string> = { alerte:'#ef4444', tension:'#f59e0b', ok:'#22c55e' }
const STATUS_BG:    Record<StockStatus, string> = { alerte:'#fef2f2', tension:'#fffbeb', ok:'#f0fdf4' }

// ── Barre de stock ────────────────────────────────────────────────

interface StockBarProps { article: Article; maxRef: number }

function StockBar({ article, maxRef }: StockBarProps) {
  const status   = getStatus(article)
  const fillPct  = maxRef > 0 ? Math.min((article.stock / maxRef) * 100, 100) : 0
  const alertPct = maxRef > 0 ? Math.min((article.stockAlerte  / maxRef) * 100, 100) : 0
  const tensPct  = maxRef > 0 ? Math.min((article.stockTension / maxRef) * 100, 100) : 0

  return (
    <div className={styles.barWrap}>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width:`${fillPct}%`, background:STATUS_COLOR[status] }} />
        {article.stockAlerte > 0 && (
          <div className={styles.marker} style={{ left:`${alertPct}%`, background:'#ef4444' }} title={`Alerte : ${article.stockAlerte}`} />
        )}
        {article.stockTension > 0 && (
          <div className={styles.marker} style={{ left:`${tensPct}%`, background:'#f59e0b' }} title={`Tension : ${article.stockTension}`} />
        )}
      </div>
      <div className={styles.barNums}>
        <span style={{ color:STATUS_COLOR[status], fontWeight:700 }}>{article.stock}</span>
        {article.stockAlerte  > 0 && <span className={styles.numSep}>alerte {article.stockAlerte}</span>}
        {article.stockTension > 0 && <span className={styles.numSep}>tension {article.stockTension}</span>}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export function StockPage() {
  const [activeTab,    setActiveTab]    = useState<StockTab>('stocks')
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'critique' | 'alpha'>('critique')
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [analyticsArticle, setAnalyticsArticle] = useState<Article | null>(null)

  const { can, upgradeMessage } = usePlanFeatures()

  const { data: rayons = [] }              = useRayons()
  const { activeRayon, activeCat, handleRayonChange, handleCatChange } = useRayonFilter('megesti:stock:filter', rayons)
  const { data: articles = [], isLoading } = useArticles(activeRayon || undefined, undefined, true)

  const filtered = useMemo(() =>
    articles
      .filter(a => typeFilter === 'all' || (typeFilter === 'mp' ? !a.vendable : a.vendable))
      .filter(a => !activeCat || a.categorie?.id === activeCat)
      .filter(a => statusFilter === 'all' || getStatus(a) === statusFilter)
      .filter(a => !search || a.nom.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'critique') {
          const order: Record<StockStatus, number> = { alerte:0, tension:1, ok:2 }
          const diff = order[getStatus(a)] - order[getStatus(b)]
          return diff !== 0 ? diff : a.stock - b.stock
        }
        return a.nom.localeCompare(b.nom, 'fr')
      })
  , [articles, typeFilter, statusFilter, search, sortBy])

  const counts = useMemo(() => ({
    alerte:  articles.filter(a => getStatus(a) === 'alerte').length,
    tension: articles.filter(a => getStatus(a) === 'tension').length,
    ok:      articles.filter(a => getStatus(a) === 'ok').length,
  }), [articles])

  const maxRef = useMemo(() =>
    Math.max(...filtered.map(a => Math.max(a.stock, a.stockTension * 1.5, 1)), 10)
  , [filtered])

  return (
    <div className={styles.page}>

      <PageHero
        title="Stock"
        subtitle={<>{articles.length} article{articles.length > 1 ? 's' : ''} en catalogue</>}
      >
        <div className={styles['header-actions']}>
          {/* Recherche */}
          {activeTab === 'stocks' && (
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Rechercher un article…"
            />
          )}

          {/* Switch tri — remplace le <select> */}
          {activeTab === 'stocks' && (
            <div className={styles['sort-switch']}>
              <button
                className={`${styles['sort-btn']} ${sortBy === 'critique' ? styles['sort-btn-active'] : ''}`}
                onClick={() => setSortBy('critique')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                Critiques d'abord
              </button>
              <button
                className={`${styles['sort-btn']} ${sortBy === 'alpha' ? styles['sort-btn-active'] : ''}`}
                onClick={() => setSortBy('alpha')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
                Alphabétique
              </button>
            </div>
          )}
        </div>
      </PageHero>

      {/* ── Tab bar ── */}
      <div className={styles['tab-bar']}>
        <button
          className={`${styles['tab-btn']} ${activeTab === 'stocks' ? styles.active : ''}`}
          onClick={() => setActiveTab('stocks')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          Niveaux de stock
        </button>
        <button
          className={`${styles['tab-btn']} ${activeTab === 'historique' ? styles.active : ''}`}
          onClick={() => setActiveTab('historique')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Historique
        </button>
      </div>

      {/* ── Historique ── */}
      {activeTab === 'historique' && <HistoriqueMouvements />}

      {/* ── Onglet Stocks ── */}
      {activeTab === 'stocks' && (
        <>
          {/* Filtre rayons / catégories */}
          {rayons.length > 0 && (
            <RayonNav
              rayons={rayons}
              activeRayon={activeRayon}
              activeCat={activeCat}
              onRayonChange={handleRayonChange}
              onCatChange={handleCatChange}
            />
          )}

          {/* Filtre type : articles vendables / matières premières */}
          <nav className={styles['rayon-nav']}>
            {([
              { key: 'all',      label: 'Tous' },
              { key: 'articles', label: 'Articles' },
              { key: 'mp',       label: 'Matières premières' },
            ] as { key: TypeFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                className={`${styles['rayon-btn']} ${typeFilter === key ? styles.active : ''}`}
                onClick={() => setTypeFilter(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Cartes synthèse */}
          <div className={styles.summaryRow}>
            {(['alerte', 'tension', 'ok'] as StockStatus[]).map(s => (
              <button
                key={s}
                className={`${styles.summaryCard} ${statusFilter === s ? styles.summaryCardActive : ''}`}
                style={{ borderColor:STATUS_COLOR[s], background:statusFilter === s ? STATUS_COLOR[s] : STATUS_BG[s] }}
                onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
              >
                <div className={styles.summaryCount} style={{ color:statusFilter === s ? 'white' : STATUS_COLOR[s] }}>
                  {counts[s]}
                </div>
                <div className={styles.summaryLabel} style={{ color:statusFilter === s ? 'rgba(255,255,255,0.85)' : STATUS_COLOR[s] }}>
                  {STATUS_LABEL[s]}
                </div>
                <div className={styles.summaryBar}>
                  <div className={styles.summaryBarFill} style={{
                    width: articles.length > 0 ? `${(counts[s] / articles.length) * 100}%` : '0%',
                    background: statusFilter === s ? 'rgba(255,255,255,0.4)' : STATUS_COLOR[s],
                  }} />
                </div>
              </button>
            ))}
            {statusFilter !== 'all' && (
              <button className={styles.clearFilter} onClick={() => setStatusFilter('all')}>
                Tout afficher ×
              </button>
            )}
          </div>

          {/* Liste */}
          {isLoading && (
            <div className={styles.skeletonList}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className={styles['empty-state']}>
              <div className={styles['empty-icon']}>📦</div>
              <div className={styles['empty-title']}>
                {search || statusFilter !== 'all'
                  ? 'Aucun article ne correspond aux filtres'
                  : 'Aucun article dans le catalogue'}
              </div>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className={styles.list}>
              {filtered.map(article => {
                const status  = getStatus(article)
                const editing = editingId === article.id
                return (
                  <div key={article.id} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <span className={styles.statusDot} style={{ background:STATUS_COLOR[status] }} title={STATUS_LABEL[status]} />
                      <div>
                        <div className={styles.articleNom}>{article.nom}</div>
                        <div className={styles.articleMeta}>
                          <span className={styles.rayonBadge}>{article.rayon.nom}</span>
                          {!article.vendable && (
                            <span className={styles.rayonBadge} style={{ background: 'var(--mauve-light)', color: 'var(--mauve)' }}>
                              Matière première
                            </span>
                          )}
                          {article.isbn && <span className={styles.isbn}>{article.isbn}</span>}
                        </div>
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      {editing ? (
                        <AjustementStock article={article} onClose={() => setEditingId(null)} />
                      ) : (
                        <div className={styles.rowRightInner}>
                          <StockBar article={article} maxRef={maxRef} />
                          {article.imprimeur?.lienCommande && (
                            <a
                              href={article.imprimeur.lienCommande}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.commanderBtn}
                              title={`Commander chez ${article.imprimeur.nom}`}
                            >
                              🖨️ Commander
                            </a>
                          )}
                          {can('stockAnalytics') ? (
                            <button
                              className={styles.analyticsBtn}
                              onClick={() => setAnalyticsArticle(article)}
                              title="Voir les graphiques de stock"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="20" x2="18" y2="10"/>
                                <line x1="12" y1="20" x2="12" y2="4"/>
                                <line x1="6"  y1="20" x2="6"  y2="14"/>
                              </svg>
                              Graphiques
                            </button>
                          ) : (
                            <span className={styles.analyticsBtnLocked} title={upgradeMessage('stockAnalytics')}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              Plan Édition
                            </span>
                          )}
                          <button
                            className={styles.adjustBtn}
                            onClick={() => setEditingId(article.id)}
                          >
                            Ajuster
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {analyticsArticle && (
        <StockHistoriqueModal
          article={analyticsArticle}
          onClose={() => setAnalyticsArticle(null)}
        />
      )}
    </div>
  )
}
