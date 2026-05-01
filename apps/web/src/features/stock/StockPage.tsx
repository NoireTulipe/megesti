import { useState, useMemo } from 'react'
import { useArticles } from '@/features/catalogue/hooks/useArticles'
import { useRayons }   from '@/features/catalogue/hooks/useRayons'
import { AjustementStock }       from './AjustementStock'
import { HistoriqueMouvements }  from './HistoriqueMouvements'
import type { Article } from '@/features/catalogue/types'
import styles from './StockPage.module.css'

type StockTab = 'stocks' | 'historique'

type StockStatus = 'alerte' | 'tension' | 'ok'

function getStatus(article: Article): StockStatus {
  if (article.stock <= article.stockAlerte)  return 'alerte'
  if (article.stock <= article.stockTension) return 'tension'
  return 'ok'
}

const STATUS_LABEL: Record<StockStatus, string> = { alerte: 'Alerte',  tension: 'Attention', ok: 'OK' }
const STATUS_COLOR: Record<StockStatus, string> = { alerte: '#ef4444', tension: '#f59e0b',   ok: '#22c55e' }
const STATUS_BG:    Record<StockStatus, string> = { alerte: '#fef2f2', tension: '#fffbeb',   ok: '#f0fdf4' }

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
        <div className={styles.barFill} style={{ width: `${fillPct}%`, background: STATUS_COLOR[status] }} />
        {article.stockAlerte > 0 && (
          <div className={styles.marker} style={{ left: `${alertPct}%`, background: '#ef4444' }} title={`Alerte : ${article.stockAlerte}`} />
        )}
        {article.stockTension > 0 && (
          <div className={styles.marker} style={{ left: `${tensPct}%`, background: '#f59e0b' }} title={`Tension : ${article.stockTension}`} />
        )}
      </div>
      <div className={styles.barNums}>
        <span style={{ color: STATUS_COLOR[status], fontWeight: 700 }}>{article.stock}</span>
        {article.stockAlerte  > 0 && <span className={styles.numSep}>alerte {article.stockAlerte}</span>}
        {article.stockTension > 0 && <span className={styles.numSep}>tension {article.stockTension}</span>}
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════

export function StockPage() {
  const [activeTab, setActiveTab]         = useState<StockTab>('stocks')
  const [rayonFilter, setRayonFilter]     = useState<string>('')
  const [statusFilter, setStatusFilter]   = useState<StockStatus | 'all'>('all')
  const [search, setSearch]               = useState('')
  const [sortBy, setSortBy]               = useState<'critique' | 'alpha'>('critique')
  const [editingId, setEditingId]         = useState<string | null>(null)

  const { data: rayons = [] }              = useRayons()
  const { data: articles = [], isLoading } = useArticles(rayonFilter || undefined, undefined, true)

  const filtered = useMemo(() => {
    return articles
      .filter(a => statusFilter === 'all' || getStatus(a) === statusFilter)
      .filter(a => !search || a.nom.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'critique') {
          const order: Record<StockStatus, number> = { alerte: 0, tension: 1, ok: 2 }
          const diff = order[getStatus(a)] - order[getStatus(b)]
          if (diff !== 0) return diff
          return a.stock - b.stock
        }
        return a.nom.localeCompare(b.nom, 'fr')
      })
  }, [articles, statusFilter, search, sortBy])

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

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock</h1>
          <p className={styles.subtitle}>{articles.length} article{articles.length > 1 ? 's' : ''} en catalogue</p>
        </div>
        {/* Onglets */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'stocks' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Niveaux de stock
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'historique' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('historique')}
          >
            📋 Historique
          </button>
        </div>
        <div className={styles.controls} style={{ display: activeTab === 'stocks' ? undefined : 'none' }}>
          <input className={styles.search} type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className={styles.select} value={rayonFilter} onChange={e => setRayonFilter(e.target.value)}>
            <option value="">Tous les rayons</option>
            {rayons.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
          <select className={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value as 'critique' | 'alpha')}>
            <option value="critique">Critiques d'abord</option>
            <option value="alpha">Ordre alphabétique</option>
          </select>
        </div>
      </header>

      {/* Onglet Historique */}
      {activeTab === 'historique' && <HistoriqueMouvements />}

      {/* Onglet Stocks — masqué quand Historique actif */}
      {activeTab === 'stocks' && <>

      {/* Cartes de synthèse */}
      <div className={styles.summaryRow}>
        {(['alerte', 'tension', 'ok'] as StockStatus[]).map(s => (
          <button
            key={s}
            className={`${styles.summaryCard} ${statusFilter === s ? styles.summaryCardActive : ''}`}
            style={{ borderColor: STATUS_COLOR[s], background: statusFilter === s ? STATUS_COLOR[s] : STATUS_BG[s] }}
            onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
          >
            <div className={styles.summaryCount} style={{ color: statusFilter === s ? 'white' : STATUS_COLOR[s] }}>
              {counts[s]}
            </div>
            <div className={styles.summaryLabel} style={{ color: statusFilter === s ? 'rgba(255,255,255,0.85)' : STATUS_COLOR[s] }}>
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
          <button className={styles.clearFilter} onClick={() => setStatusFilter('all')}>Tout afficher ×</button>
        )}
      </div>

      {/* Liste */}
      {isLoading && (
        <div className={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className={styles.empty}>
          <p>{search || statusFilter !== 'all' ? 'Aucun article ne correspond aux filtres.' : 'Aucun article dans le catalogue.'}</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className={styles.list}>
          {filtered.map(article => {
            const status = getStatus(article)
            const editing = editingId === article.id
            return (
              <div key={article.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.statusDot} style={{ background: STATUS_COLOR[status] }} title={STATUS_LABEL[status]} />
                  <div>
                    <div className={styles.articleNom}>{article.nom}</div>
                    <div className={styles.articleMeta}>
                      <span className={styles.rayonBadge}>{article.rayon.nom}</span>
                      {article.isbn && <span className={styles.isbn}>{article.isbn}</span>}
                    </div>
                  </div>
                </div>
                <div className={styles.rowRight}>
                  {editing
                    ? (
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
                          title="Ajuster le stock"
                        >
                          Ajuster
                        </button>
                      </div>
                    )
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      </>}
    </div>
  )
}
