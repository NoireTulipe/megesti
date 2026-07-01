import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useRapportVentes, type Period } from './hooks/useRapports'
import { EmptyState } from '@/components/ui/EmptyState'
import { MascoteBlock } from '@/components/MascoteBlock'
import { PageHero } from '@/components/PageHero'
import styles from './ComptabilitePage.module.css'

// ── Palette harmonisée avec le design system ──────────────────────
const COLORS = {
  rose:  '#C4907C',
  gold:  '#C9933A',
  sage:  '#6B8F71',
  mauve: '#8B7BAB',
  ink:   '#3D5470',
  terra: '#C85D3A',
}
const PALETTE = [COLORS.rose, COLORS.gold, COLORS.sage, COLORS.mauve, COLORS.ink, COLORS.terra]

const PERIOD_LABELS: Record<Period, string> = {
  '7d':  '7 derniers jours',
  '30d': '30 derniers jours',
  '3m':  '3 derniers mois',
  '12m': '12 derniers mois',
  'all': 'Tout le temps',
}

// ── Formatters ────────────────────────────────────────────────────
function fEur(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}
function fDate(iso: string, gran: 'day' | 'week' | 'month') {
  const d = new Date(iso)
  if (gran === 'month') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  if (gran === 'week')  return `Sem. ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function fMode(m: string) {
  const LABELS: Record<string, string> = { CB: 'Carte', ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', SUMUP: 'SumUp' }
  return LABELS[m] ?? m
}

// ── Tooltip personnalisé ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className={styles.tooltipRow} style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className={styles.tooltipVal}>{typeof p.value === 'number' && p.value > 100 ? fEur(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Carte stat de synthèse ────────────────────────────────────────
function StatCard({ label, value, sub, color = 'rose', emoji }: { label: string; value: string; sub?: string; color?: string; emoji: string }) {
  return (
    <div className={styles.statCard} style={{ '--accent': color } as React.CSSProperties}>
      <div className={styles.statEmoji}>{emoji}</div>
      <div className={styles.statBody}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
        {sub && <p className={styles.statSub}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Contenant de section ─────────────────────────────────────────
function ChartSection({ title, emoji, children, full = false }: { title: string; emoji: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`${styles.section} ${full ? styles.sectionFull : ''}`}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionEmoji}>{emoji}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════

export function ComptabilitePage() {
  const [period, setPeriod] = useState<Period>('30d')
  const { data, isLoading, isError } = useRapportVentes(period)

  if (isLoading) return <LoadingState />
  if (isError || !data) return (
    <EmptyState
      emoji="📊"
      title="Impossible de charger les rapports"
      description="Vérifiez que le serveur est accessible et rechargez la page."
    />
  )

  const { summary, evolution, topArticles, caParRayon, caParPDV, caParMode, associations, periode, exemplairesAuteurs, topBenefice } = data
  const topQte = [...topArticles].sort((a, b) => b.quantite - a.quantite).slice(0, 10)
  const topCA  = [...topArticles].slice(0, 10)

  const hasData = summary.nbVentes > 0 || (exemplairesAuteurs?.totalTTC ?? 0) > 0

  return (
    <div className={styles.page}>

      <PageHero title="Rapports & statistiques" subtitle={PERIOD_LABELS[period]}>
        <div className={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'all' ? 'Tout' : p === '7d' ? '7 j' : p === '30d' ? '30 j' : p === '3m' ? '3 mois' : '1 an'}
            </button>
          ))}
        </div>
      </PageHero>

      {!hasData ? (
        <MascoteBlock slug="stats-no-data" />
      ) : (
        <div className={styles.content}>

          {/* ── Métriques synthèse — totaux consolidés ── */}
          <div className={styles.statsRow}>
            <StatCard
              emoji="💰" label="Chiffre d'affaires TTC"
              value={fEur(summary.totalTTC + (exemplairesAuteurs?.totalTTC ?? 0))}
              sub={`Lecteurs: ${fEur(summary.totalTTC)}${(exemplairesAuteurs?.totalTTC ?? 0) > 0 ? ` · Auteurs: ${fEur(exemplairesAuteurs!.totalTTC)}` : ''}`}
              color={COLORS.rose}
            />
            <StatCard
              emoji="🛒" label="Ventes validées"
              value={String(summary.nbVentes + (exemplairesAuteurs?.nbVentes ?? 0))}
              sub={`Lecteurs: ${summary.nbVentes}${(exemplairesAuteurs?.nbVentes ?? 0) > 0 ? ` · Auteurs: ${exemplairesAuteurs!.nbVentes}` : ''}${summary.nbAnnulees > 0 ? ` · ${summary.nbAnnulees} annulée(s)` : ''}`}
              color={COLORS.sage}
            />
            <StatCard emoji="🎯" label="Ticket moyen lecteurs" value={fEur(summary.ticketMoyen)} sub="par transaction lecteur" color={COLORS.gold} />
            <StatCard emoji="📦" label="Articles vendus" value={String(topArticles.reduce((s, a) => s + a.quantite, 0))} sub="ventes lecteurs" color={COLORS.mauve} />
          </div>

          {/* ── Évolution CA lecteurs ── */}
          <ChartSection title="Évolution CA — ventes lecteurs" emoji="📈" full>
            {evolution.length === 0 ? (
              <p className={styles.noData}>Pas de données sur cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={evolution.map(e => ({ ...e, label: fDate(e.date, periode.granularite) }))}>
                  <defs>
                    <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={COLORS.rose} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fEur(v)} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ca" name="CA TTC" stroke={COLORS.rose} strokeWidth={2.5} fill="url(#gradCA)" dot={false} activeDot={{ r: 5, fill: COLORS.rose }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartSection>

          {/* ── Grille 2 colonnes ── */}
          <div className={styles.grid2}>

            {/* Top produits par CA */}
            <ChartSection title="Top produits — chiffre d'affaires" emoji="🏆">
              {topCA.length === 0 ? <p className={styles.noData}>Aucune donnée.</p> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topCA} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => fEur(v)} tick={{ fontSize: 10, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 11, fill: 'var(--ink)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.length > 16 ? v.slice(0, 14) + '…' : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ca" name="CA TTC" radius={[0, 6, 6, 0]}>
                      {topCA.map((_, i) => <Cell key={i} fill={i === 0 ? COLORS.rose : i < 3 ? COLORS.gold : 'var(--cream-dark)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartSection>

            {/* Top produits par quantité */}
            <ChartSection title="Top produits — quantités vendues" emoji="📦">
              {topQte.length === 0 ? <p className={styles.noData}>Aucune donnée.</p> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topQte} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 11, fill: 'var(--ink)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.length > 16 ? v.slice(0, 14) + '…' : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quantite" name="Exemplaires" radius={[0, 6, 6, 0]}>
                      {topQte.map((_, i) => <Cell key={i} fill={i === 0 ? COLORS.sage : i < 3 ? '#95BF99' : 'var(--cream-dark)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartSection>

            {/* CA par rayon — donut */}
            <ChartSection title="Répartition par rayon" emoji="🗂️">
              {caParRayon.length === 0 ? <p className={styles.noData}>Aucune donnée.</p> : (
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={caParRayon} dataKey="ca" nameKey="nom" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {caParRayon.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.legend}>
                    {caParRayon.map((r, i) => (
                      <div key={r.rayonId} className={styles.legendRow}>
                        <span className={styles.legendDot} style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className={styles.legendName}>{r.nom}</span>
                        <span className={styles.legendVal}>{fEur(r.ca)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartSection>

            {/* Modes de paiement */}
            <ChartSection title="Modes de paiement" emoji="💳">
              {caParMode.length === 0 ? <p className={styles.noData}>Aucune donnée.</p> : (
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={caParMode.map(m => ({ ...m, nom: fMode(m.mode) }))} dataKey="ca" nameKey="nom" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {caParMode.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.legend}>
                    {caParMode.map((m, i) => (
                      <div key={m.mode} className={styles.legendRow}>
                        <span className={styles.legendDot} style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className={styles.legendName}>{fMode(m.mode)}</span>
                        <span className={styles.legendVal}>{m.nb} vte{m.nb > 1 ? 's' : ''}</span>
                        <span className={styles.legendVal}>{fEur(m.ca)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartSection>
          </div>

          {/* ── Top bénéfice brut ── */}
          {(topBenefice?.length ?? 0) > 0 && (
            <ChartSection title="Top bénéfice brut" emoji="💎" full>
              <p className={styles.assocSub}>Marge brute estimée par titre (CA TTC - coût d'achat). Articles sans prix d'achat renseigné : coût = 0.</p>
              <ResponsiveContainer width="100%" height={Math.max(160, topBenefice.length * 38)}>
                <BarChart data={topBenefice} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fEur(v)} tick={{ fontSize: 10, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11, fill: 'var(--ink)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 18 ? v.slice(0, 16) + '…' : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="benefice" name="Marge brute" radius={[0, 6, 6, 0]}>
                    {topBenefice.map((r, i) => (
                      <Cell key={i} fill={
                        r.cout === 0 ? 'var(--cream-dark)'
                        : i === 0    ? COLORS.sage
                        : i < 3      ? '#7AAF7F'
                        : '#A3C5A8'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>
          )}

          {/* ── Points de vente ── */}
          {caParPDV.length > 0 && (
            <ChartSection title="Chiffre d'affaires par point de vente" emoji="🏪" full>
              <ResponsiveContainer width="100%" height={Math.max(160, caParPDV.length * 52)}>
                <BarChart data={caParPDV} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fEur(v)} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nom" width={140} tick={{ fontSize: 12, fill: 'var(--ink)', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ca" name="CA TTC" radius={[0, 8, 8, 0]}>
                    {caParPDV.map((_, i) => (
                      <Cell key={i}
                        fill={i === 0
                          ? COLORS.rose
                          : `color-mix(in srgb, ${COLORS.rose} ${Math.max(30, 100 - i * 18)}%, var(--cream-dark))`
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Tableau récap PDV */}
              <div className={styles.pdvTable}>
                {caParPDV.map((pdv, i) => (
                  <div key={pdv.pdvId} className={styles.pdvRow}>
                    <span className={styles.pdvRank}>{i + 1}</span>
                    <span className={styles.pdvNom}>{pdv.nom}</span>
                    <span className={styles.pdvVentes}>{pdv.nbVentes} vente{pdv.nbVentes > 1 ? 's' : ''}</span>
                    <span className={styles.pdvCA}>{fEur(pdv.ca)}</span>
                  </div>
                ))}
              </div>
            </ChartSection>
          )}

          {/* ── Associations panier ── */}
          {associations.length > 0 && (
            <ChartSection title="Produits souvent achetés ensemble" emoji="🛍️" full>
              <p className={styles.assocSub}>Articles qui apparaissent fréquemment dans le même panier.</p>
              <div className={styles.assocGrid}>
                {associations.map((a, i) => (
                  <div key={i} className={styles.assocCard}>
                    <div className={styles.assocProducts}>
                      <span className={styles.assocProd}>{a.produit1}</span>
                      <span className={styles.assocPlus}>+</span>
                      <span className={styles.assocProd}>{a.produit2}</span>
                    </div>
                    <div className={styles.assocCount}>
                      <span className={styles.assocNb}>{a.nb}×</span>
                      <span className={styles.assocLabel}>ensemble</span>
                    </div>
                    <div className={styles.assocBar}>
                      <div
                        className={styles.assocBarFill}
                        style={{ width: `${(a.nb / associations[0].nb) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartSection>
          )}

          {/* ── Ventes exemplaires auteurs ── */}
          <ChartSection title="Ventes exemplaires auteurs" emoji="📗" full>
            {!(exemplairesAuteurs) || exemplairesAuteurs.totalTTC === 0 ? (
              <p className={styles.noData}>Aucune vente d'exemplaires à auteur sur la période.</p>
            ) : (
              <>
                <div className={styles.pdvTable}>
                  {exemplairesAuteurs.parAuteur.map((a, i) => (
                    <div key={a.auteurId} className={styles.pdvRow}>
                      <span className={styles.pdvRank}>{i + 1}</span>
                      <span className={styles.pdvNom}>{a.nomAuteur}</span>
                      <span className={styles.pdvVentes}>{a.nb} vente{a.nb > 1 ? 's' : ''}</span>
                      <span className={styles.pdvVentes}>{fEur(a.caHT)} HT</span>
                      <span className={styles.pdvCA}>{fEur(a.caTTC)}</span>
                    </div>
                  ))}
                </div>
                <p className={styles.assocSub} style={{ marginTop: 14, textAlign: 'right' }}>
                  Total : <strong>{fEur(exemplairesAuteurs.totalHT)} HT</strong> · <strong>{fEur(exemplairesAuteurs.totalTTC)} TTC</strong>
                </p>
              </>
            )}
          </ChartSection>

        </div>
      )}
    </div>
  )
}

// ── Skeleton loading ──────────────────────────────────────────────
function LoadingState() {
  return (
    <div className={styles.page}>
      <PageHero title="Chargement…" />
      <div className={styles.content}>
        <div className={styles.statsRow}>
          {[1,2,3,4].map(i => <div key={i} className={`${styles.skeletonBlock} ${styles.skStat}`} />)}
        </div>
        <div className={`${styles.skeletonBlock} ${styles.skChart}`} />
        <div className={styles.grid2}>
          {[1,2,3,4].map(i => <div key={i} className={`${styles.skeletonBlock} ${styles.skChartSm}`} />)}
        </div>
      </div>
    </div>
  )
}
