import { useState, useMemo } from 'react'
import { Overlay } from '@/components/ui/Overlay'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import { useStockTimeline, MVT_LABELS } from './hooks/useMouvementsStock'
import type { MvtPeriod, StockEventType } from './hooks/useMouvementsStock'
import type { Article } from '@/features/catalogue/types'
import { toLocalISO } from '@/lib/date'
import styles from './StockHistoriqueModal.module.css'

// ── Helpers date ──────────────────────────────────────────────────

function bucketKey(iso: string, period: MvtPeriod): string {
  const d = new Date(iso)
  if (period === '7d' || period === '30d') return toLocalISO(d)
  if (period === '3m') {
    const day = d.getDay() || 7
    const mon = new Date(d)
    mon.setDate(d.getDate() - day + 1)
    return toLocalISO(mon)
  }
  return toLocalISO(d).slice(0, 7)
}

function bucketLabel(key: string, period: MvtPeriod): string {
  if (period === '12m') {
    const [y = '1970', m = '1'] = key.split('-')
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }
  return new Date(key).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function fmtAxisTick(iso: string, period: MvtPeriod): string {
  const d = new Date(iso)
  if (period === '7d')  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  if (period === '30d') return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (period === '3m')  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PERIOD_LABELS: Record<MvtPeriod, string> = { '7d':'7 j', '30d':'30 j', '3m':'3 mois', '12m':'12 mois' }

// ── Tooltip personnalisé ──────────────────────────────────────────

function AreaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{d.fullDate}</div>
      <div className={styles.tooltipStock}>{d.stock} ex.</div>
      <div className={styles.tooltipDelta} style={{ color: d.delta > 0 ? '#22C55E' : d.type === 'VENTE' ? '#3B82F6' : '#EF4444' }}>
        {d.delta > 0 ? `+${d.delta}` : d.delta} — {MVT_LABELS[d.type as StockEventType]}
      </div>
      {d.motif && <div className={styles.tooltipMotif}>{d.motif}</div>}
    </div>
  )
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: '0.82rem', fontWeight: 600 }}>
          {p.name} : {p.value > 0 ? `+${p.value}` : p.value} ex.
        </div>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────

interface Props {
  article: Article
  onClose: () => void
}

export function StockHistoriqueModal({ article, onClose }: Props) {
  const [period, setPeriod] = useState<MvtPeriod>('30d')
  const { data: events = [], isLoading } = useStockTimeline(article.id, period)

  const stats = useMemo(() => {
    const entrees = events.filter(e => e.delta > 0).reduce((s, e) => s + e.delta, 0)
    const sorties = events.filter(e => e.delta < 0).reduce((s, e) => s + Math.abs(e.delta), 0)
    const ventes  = events.filter(e => e.type === 'VENTE').reduce((s, e) => s + Math.abs(e.delta), 0)
    return { entrees, sorties, ventes, solde: entrees - sorties }
  }, [events])

  const areaData = useMemo(() =>
    events.map(e => ({
      label:    fmtAxisTick(e.createdAt, period),
      fullDate: fmtFull(e.createdAt),
      stock:    e.stockApres,
      delta:    e.delta,
      type:     e.type,
      motif:    e.motif,
    }))
  , [events, period])

  const barData = useMemo(() => {
    if (!events.length) return []
    const map = new Map<string, { label: string; entrees: number; ventes: number; sorties: number }>()
    for (const e of events) {
      const key = bucketKey(e.createdAt, period)
      if (!map.has(key)) map.set(key, { label: bucketLabel(key, period), entrees: 0, ventes: 0, sorties: 0 })
      const b = map.get(key)!
      if (e.delta > 0)          b.entrees += e.delta
      else if (e.type === 'VENTE') b.ventes  += Math.abs(e.delta)
      else                         b.sorties += Math.abs(e.delta)
    }
    return Array.from(map.values())
  }, [events, period])

  const stockAlerte  = article.stockAlerte  > 0 ? article.stockAlerte  : null
  const stockTension = article.stockTension > 0 ? article.stockTension : null

  return (
    <Overlay className={styles.backdrop} onClose={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal>

        {/* Barre accent */}
        <div className={styles.accent} />

        {/* Décos */}
        <div className={styles.deco} aria-hidden>
          <div className={styles.blobA} />
          <div className={styles.blobB} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{article.nom}</h2>
            <div className={styles.headerMeta}>
              <span className={styles.rayonBadge}>{article.rayon.nom}</span>
              {article.categorie && <span className={styles.catBadge}>{article.categorie.nom}</span>}
              <span className={styles.stockBadge}
                style={{ background: article.stock <= (stockAlerte ?? 0) ? '#FEF2F2' : '#F0FDF4',
                         color:      article.stock <= (stockAlerte ?? 0) ? '#B91C1C' : '#166534',
                         borderColor:article.stock <= (stockAlerte ?? 0) ? '#FECACA' : '#BBF7D0' }}>
                {article.stock} ex. en stock
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Période */}
        <div className={styles.periodRow}>
          {(['7d','30d','3m','12m'] as MvtPeriod[]).map(p => (
            <button key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard} style={{ borderColor:'#BBF7D0', background:'#F0FDF4' }}>
            <div className={styles.statValue} style={{ color:'#166534' }}>+{stats.entrees}</div>
            <div className={styles.statLabel} style={{ color:'#15803D' }}>Entrées</div>
          </div>
          <div className={styles.statCard} style={{ borderColor:'#BFDBFE', background:'#EFF6FF' }}>
            <div className={styles.statValue} style={{ color:'#1D4ED8' }}>−{stats.ventes}</div>
            <div className={styles.statLabel} style={{ color:'#2563EB' }}>Ventes</div>
          </div>
          <div className={styles.statCard} style={{ borderColor:'#FECACA', background:'#FEF2F2' }}>
            <div className={styles.statValue} style={{ color:'#B91C1C' }}>−{stats.sorties}</div>
            <div className={styles.statLabel} style={{ color:'#DC2626' }}>Autres sorties</div>
          </div>
          <div className={styles.statCard}
            style={{ borderColor: stats.solde >= 0 ? '#BBF7D0' : '#FECACA',
                     background:  stats.solde >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
            <div className={styles.statValue}
              style={{ color: stats.solde >= 0 ? '#166534' : '#B91C1C' }}>
              {stats.solde >= 0 ? `+${stats.solde}` : stats.solde}
            </div>
            <div className={styles.statLabel} style={{ color:'var(--text-soft)' }}>Solde net</div>
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingRow}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} style={{ height: 130 }} />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className={styles.emptyState}>
            Aucun mouvement de stock sur cette période.
          </div>
        )}

        {!isLoading && areaData.length > 0 && (
          <>
            {/* Courbe évolution */}
            <div className={styles.chartSection}>
              <div className={styles.chartLabel}>Évolution du stock</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={areaData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C4847A" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#C4847A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    domain={['auto', 'auto']} />
                  <Tooltip content={<AreaTooltip />} />
                  {stockAlerte  && <ReferenceLine y={stockAlerte}  stroke="#EF4444" strokeDasharray="5 3" strokeWidth={1.5} label={{ value:`Alerte ${stockAlerte}`,  position:'insideTopRight', fontSize:9, fill:'#EF4444' }} />}
                  {stockTension && <ReferenceLine y={stockTension} stroke="#F59E0B" strokeDasharray="5 3" strokeWidth={1.5} label={{ value:`Tension ${stockTension}`, position:'insideTopRight', fontSize:9, fill:'#F59E0B' }} />}
                  <Area type="monotone" dataKey="stock" name="Stock"
                    stroke="#C4847A" strokeWidth={2.5}
                    fill="url(#stockGrad)"
                    dot={{ r: 3, fill: '#C4847A', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#C4847A', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Histogramme entrées / sorties */}
            {barData.length > 0 && (
              <div className={styles.chartSection}>
                <div className={styles.chartLabel}>
                  Entrées & Sorties
                  <span className={styles.chartLegend}>
                    <span className={styles.legendDot} style={{ background:'#22C55E' }} />Entrées
                    <span className={styles.legendDot} style={{ background:'#3B82F6' }} />Ventes
                    <span className={styles.legendDot} style={{ background:'#EF4444' }} />Autres sorties
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={barData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="entrees" name="Entrées"        fill="#22C55E" radius={[4,4,0,0]} maxBarSize={36} />
                    <Bar dataKey="ventes"  name="Ventes"         fill="#3B82F6" radius={[4,4,0,0]} maxBarSize={36} />
                    <Bar dataKey="sorties" name="Autres sorties" fill="#EF4444" radius={[4,4,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  )
}
