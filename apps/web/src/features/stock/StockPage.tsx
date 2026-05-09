import { useState, useMemo } from 'react'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useRayons }   from '@/features/catalogue/hooks/useRayons'
import { AjustementStock }      from './AjustementStock'
import { HistoriqueMouvements } from './HistoriqueMouvements'
import type { Article } from '@/features/catalogue/types'
import styles from './StockPage.module.css'

type StockTab    = 'stocks' | 'historique'
type StockStatus = 'alerte' | 'tension' | 'ok'

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
  const [rayonFilter,  setRayonFilter]  = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'critique' | 'alpha'>('critique')
  const [editingId,    setEditingId]    = useState<string | null>(null)

  const { data: rayons = [] }              = useRayons()
  const { data: articles = [], isLoading } = useArticles(rayonFilter || undefined, undefined, true)

  const filtered = useMemo(() =>
    articles
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
  , [articles, statusFilter, search, sortBy])

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

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles['page-title']}>Stock</h1>
          <p className={styles['page-subtitle']}>
            {articles.length} article{articles.length > 1 ? 's' : ''} en catalogue
          </p>
        </div>

        <div className={styles['header-actions']}>
          {/* Recherche */}
          {activeTab === 'stocks' && (
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
      </header>

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
          {/* Filtre rayons — remplace le <select> */}
          {rayons.length > 0 && (
            <nav className={styles['rayon-nav']}>
              <button
                className={`${styles['rayon-btn']} ${!rayonFilter ? styles.active : ''}`}
                onClick={() => setRayonFilter('')}
              >
                Tous
              </button>
              {rayons.map(r => (
                <button
                  key={r.id}
                  className={`${styles['rayon-btn']} ${rayonFilter === r.id ? styles.active : ''}`}
                  onClick={() => setRayonFilter(r.id)}
                >
                  {r.nom}
                </button>
              ))}
            </nav>
          )}

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
    </div>
  )
}
