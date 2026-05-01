import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Modal } from '@/components/ui/Modal'
import { ContratsAuteurSection } from './ContratsAuteurSection'
import { useAuteurDetail } from './hooks/useAuteurs'
import { useVentesStatsAuteur } from './hooks/useVentesStatsAuteur'
import type { Auteur } from './hooks/useAuteurs'
import sty from './AuteurDetail.module.css'

// ── Avatar ──────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #C4907C 0%, #D4A070 100%)',
  'linear-gradient(135deg, #8B7BAB 0%, #A090C0 100%)',
  'linear-gradient(135deg, #6B8F71 0%, #85A88A 100%)',
  'linear-gradient(135deg, #C9933A 0%, #D4A855 100%)',
  'linear-gradient(135deg, #3D5470 0%, #5470A0 100%)',
]

function gradient(name: string) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

function initiales(prenom: string, nom: string) {
  return `${prenom[0]}${nom[0]}`.toUpperCase()
}

// ── Tooltip personnalisé ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={sty.tooltip}>
      <div className={sty.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={sty.tooltipRow}>
          <span>{p.name}</span>
          <strong>
            {p.name === 'CA HT (€)'
              ? `${Number(p.value).toFixed(2)} €`
              : `${p.value} ex.`}
          </strong>
        </div>
      ))}
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────

interface Props {
  auteur:   Auteur
  isOpen:   boolean
  onClose:  () => void
  onEdit:   () => void
}

type Period = 1 | 3 | 12

export function AuteurDetail({ auteur, isOpen, onClose, onEdit }: Props) {
  const [period, setPeriod] = useState<Period>(12)

  const { data: detail, isLoading: loadingDetail } = useAuteurDetail(isOpen ? auteur.id : undefined)
  const { data: stats,  isLoading: loadingStats  } = useVentesStatsAuteur(isOpen ? auteur.id : undefined, period)

  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`
  const grad       = gradient(auteur.nom)
  const articles   = detail?.articles ?? []
  const months     = stats?.months ?? []

  const totalQte = months.reduce((s, m) => s + m.quantite, 0)
  const totalHT  = months.reduce((s, m) => s + m.totalHT, 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={nomAffiche}
      subtitle={auteur.pseudonyme ? `${auteur.prenom} ${auteur.nom}` : 'Fiche auteur'}
      size="xl"
    >
      <div className={sty.root}>

        {/* ── Profile header ── */}
        <div className={sty.profileHeader}>
          <div className={sty.avatar} style={{ background: grad }}>
            {initiales(auteur.prenom, auteur.nom)}
          </div>
          <div className={sty.profileInfo}>
            {auteur.email && (
              <a href={`mailto:${auteur.email}`} className={sty.email}>{auteur.email}</a>
            )}
            {auteur.bio && <p className={sty.bio}>{auteur.bio}</p>}
            <div className={sty.statsPills}>
              <span className={sty.pill}>
                {loadingDetail ? '…' : articles.length} livre{articles.length !== 1 ? 's' : ''}
              </span>
              <span className={sty.pill}>
                {auteur._count.contrats} contrat{auteur._count.contrats !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button className={sty.editBtn} onClick={onEdit}>Modifier</button>
        </div>

        {/* ── Graphique ventes ── */}
        <section className={sty.section}>
          <div className={sty.sectionHeader}>
            <h3 className={sty.sectionTitle}>Ventes</h3>
            <div className={sty.periodTabs}>
              {([1, 3, 12] as Period[]).map(p => (
                <button
                  key={p}
                  className={`${sty.periodTab} ${period === p ? sty.periodTabActive : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === 1 ? '1 mois' : p === 3 ? '3 mois' : '12 mois'}
                </button>
              ))}
            </div>
          </div>

          {loadingStats ? (
            <div className={sty.chartSkeleton} />
          ) : totalQte === 0 ? (
            <p className={sty.emptyChart}>Aucune vente sur cette période.</p>
          ) : (
            <>
              <div className={sty.chartSummary}>
                <div className={sty.chartStat}>
                  <span className={sty.chartStatValue}>{totalQte}</span>
                  <span className={sty.chartStatLabel}>exemplaires vendus</span>
                </div>
                <div className={sty.chartStat}>
                  <span className={sty.chartStatValue}>{totalHT.toFixed(2)} €</span>
                  <span className={sty.chartStatLabel}>CA HT total</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradQte" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C4907C" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C4907C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8B7BAB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B7BAB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="qte" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={28} />
                  <YAxis yAxisId="ht"  orientation="right" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={42} tickFormatter={v => `${v}€`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-soft)' }} />
                  <Area yAxisId="qte" type="monotone" dataKey="quantite" name="Exemplaires" stroke="#C4907C" strokeWidth={2} fill="url(#gradQte)" dot={false} />
                  <Area yAxisId="ht"  type="monotone" dataKey="totalHT"  name="CA HT (€)"  stroke="#8B7BAB" strokeWidth={2} fill="url(#gradHT)"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </section>

        {/* ── Deux colonnes : Livres + Contrats ── */}
        <div className={sty.columns}>

          {/* Livres */}
          <section className={sty.section}>
            <h3 className={sty.sectionTitle}>Livres</h3>
            {loadingDetail ? (
              <div className={sty.listSkeleton}>
                {[1, 2, 3].map(i => <div key={i} className={sty.skeletonItem} />)}
              </div>
            ) : articles.length === 0 ? (
              <p className={sty.emptyText}>Aucun livre associé à cet auteur.</p>
            ) : (
              <ul className={sty.articleList}>
                {articles.map(({ article }) => (
                  <li key={article.id} className={sty.articleItem}>
                    <div className={sty.articleCover}>
                      {article.nom[0].toUpperCase()}
                    </div>
                    <div className={sty.articleInfo}>
                      <span className={sty.articleNom}>{article.nom}</span>
                      <span className={sty.articleMeta}>
                        {article.isbn && <span className={sty.isbn}>ISBN {article.isbn}</span>}
                        <span>{Number(article.prixVenteHT).toFixed(2)} € HT</span>
                        <span className={article.stock <= 0 ? sty.stockVide : sty.stockOk}>
                          {article.stock} en stock
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Contrats */}
          <section className={sty.section}>
            <ContratsAuteurSection auteur={auteur} />
          </section>

        </div>
      </div>
    </Modal>
  )
}
