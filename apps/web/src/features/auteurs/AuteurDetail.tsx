import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ContratsAuteurSection } from './ContratsAuteurSection'
import { useAuteurDetail } from './hooks/useAuteurs'
import { useVentesStatsAuteur } from './hooks/useVentesStatsAuteur'
import type { Auteur } from './hooks/useAuteurs'
import sty from './AuteursPage.module.css'

const GRADIENTS = [
  'linear-gradient(135deg,#C4907C,#D4A070)',
  'linear-gradient(135deg,#8B7BAB,#A090C0)',
  'linear-gradient(135deg,#6B8F71,#85A88A)',
  'linear-gradient(135deg,#C9933A,#D4A855)',
  'linear-gradient(135deg,#5B6E8A,#7090B8)',
]
const COVER_GRADIENTS = [
  'linear-gradient(160deg,#C4907C,#8B7BAB)',
  'linear-gradient(160deg,#8B7BAB,#6B8F71)',
  'linear-gradient(160deg,#C9933A,#C4907C)',
  'linear-gradient(160deg,#6B8F71,#5B6E8A)',
  'linear-gradient(160deg,#5B6E8A,#C9933A)',
]

function cardGradient(name: string) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

type TabId = 'profil' | 'ventes' | 'livres' | 'contrats'
type Period = 1 | 3 | 12

const TABS: { id: TabId; label: string; path: string }[] = [
  { id: 'profil',   label: 'Profil',   path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'ventes',   label: 'Ventes',   path: 'M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3' },
  { id: 'livres',   label: 'Livres',   path: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { id: 'contrats', label: 'Contrats', path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
]

interface Props {
  auteur:  Auteur
  isOpen:  boolean
  onClose: () => void
  onEdit:  () => void
}

export function AuteurDetail({ auteur, isOpen, onClose, onEdit }: Props) {
  const [tab, setTab]       = useState<TabId>('profil')
  const [period, setPeriod] = useState<Period>(12)

  const { data: detail, isLoading: loadingDetail } = useAuteurDetail(isOpen ? auteur.id : undefined)
  const { data: stats,  isLoading: loadingStats  } = useVentesStatsAuteur(isOpen ? auteur.id : undefined, period)

  const nomAffiche = auteur.pseudonyme ?? `${auteur.prenom} ${auteur.nom}`
  const gradient   = cardGradient(auteur.nom)
  const articles   = detail?.articles ?? []
  const months     = stats?.months ?? []
  const totalQte   = months.reduce((s, m) => s + m.quantite, 0)
  const totalHT    = months.reduce((s, m) => s + m.totalHT, 0)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className={sty.backdrop} onClick={onClose}>
      <div
        className={`${sty.modal} ${sty['modal-xl']}`}
        style={{ display: 'flex', flexDirection: 'column' }}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <button className={sty['modal-close']} onClick={onClose} aria-label="Fermer">✕</button>


        {/* Header */}
        <div className={sty['detail-header']}>
          <div className={sty['detail-hero']}>
            <div className={sty['detail-avatar']} style={{ background: gradient }}>
              {`${auteur.prenom[0]}${auteur.nom[0]}`.toUpperCase()}
            </div>
            <div className={sty['detail-hero-info']}>
              <div className={sty['detail-hero-name']}>{nomAffiche}</div>
              {auteur.pseudonyme && (
                <div className={sty['detail-hero-civil']}>{auteur.prenom} {auteur.nom}</div>
              )}
              <div className={sty['detail-hero-pills']}>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-livres']}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  {auteur._count.articles} livre{auteur._count.articles !== 1 ? 's' : ''}
                </span>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-contrats']}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  {auteur._count.contrats} contrat{auteur._count.contrats !== 1 ? 's' : ''}
                </span>
                {auteur.email && (
                  <a href={`mailto:${auteur.email}`} className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-email']}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {auteur.email}
                  </a>
                )}
              </div>
            </div>
            <button className={sty['detail-edit-btn']} onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier
            </button>
          </div>

          {/* Onglets */}
          <div className={sty['detail-tabs']}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${sty['detail-tab']} ${tab === t.id ? sty.active : ''}`}
                onClick={() => setTab(t.id)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {t.path.split(' M ').map((seg, i) => <path key={i} d={i === 0 ? seg : `M ${seg}`} />)}
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corps */}
        <div className={sty['detail-body']}>

          {/* ── Profil ── */}
          {tab === 'profil' && (
            <div className={sty['profil-grid']}>
              <div className={sty['profil-field']}><label>Prénom</label><span>{auteur.prenom}</span></div>
              <div className={sty['profil-field']}><label>Nom</label><span>{auteur.nom}</span></div>
              {auteur.pseudonyme && (
                <div className={sty['profil-field']}><label>Pseudonyme</label><span>{auteur.pseudonyme}</span></div>
              )}
              {auteur.email && (
                <div className={sty['profil-field']}>
                  <label>Email</label>
                  <a href={`mailto:${auteur.email}`}>{auteur.email}</a>
                </div>
              )}
              {auteur.bio && (
                <div className={`${sty['profil-field']} ${sty.full}`}>
                  <label>Biographie</label>
                  <span style={{ lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{auteur.bio}</span>
                </div>
              )}
              {!auteur.bio && !auteur.email && (
                <div className={`${sty['profil-field']} ${sty.full}`}>
                  <label>Note</label>
                  <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>Aucune information complémentaire.</span>
                </div>
              )}
            </div>
          )}

          {/* ── Ventes ── */}
          {tab === 'ventes' && (
            <div>
              <div className={sty['ventes-header']}>
                <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1rem', color: 'var(--ink)' }}>
                  Évolution des ventes
                </span>
                <div className={sty['period-tabs']}>
                  {([1, 3, 12] as Period[]).map(p => (
                    <button
                      key={p}
                      className={`${sty['period-tab']} ${period === p ? sty.active : ''}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p === 1 ? '1 mois' : p === 3 ? '3 mois' : '12 mois'}
                    </button>
                  ))}
                </div>
              </div>
              {loadingStats ? (
                <div style={{ height: 160, background: 'var(--cream-mid)', borderRadius: 12, animation: 'shimmer 1.6s infinite' }} />
              ) : totalQte === 0 ? (
                <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: 16 }}>
                  Aucune vente sur cette période.
                </p>
              ) : (
                <>
                  <div className={sty['ventes-stats']}>
                    <div className={sty['ventes-stat']}>
                      <span className={sty['ventes-stat-value']}>{totalQte}</span>
                      <span className={sty['ventes-stat-label']}>exemplaires vendus</span>
                    </div>
                    <div className={sty['ventes-stat']}>
                      <span className={sty['ventes-stat-value']}>{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                      <span className={sty['ventes-stat-label']}>CA HT total</span>
                    </div>
                    <div className={sty['ventes-stat']}>
                      <span className={sty['ventes-stat-value']}>{(totalQte / (months.length || 1)).toFixed(0)}</span>
                      <span className={sty['ventes-stat-label']}>moy. / mois</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTerra" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C4907C" stopOpacity={0.28}/>
                          <stop offset="100%" stopColor="#C4907C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4,3" stroke="#E2D5CA" vertical={false}/>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8C7066' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 10, fill: '#8C7066' }} axisLine={false} tickLine={false} width={28}/>
                      <Tooltip formatter={(v: number) => [`${v} ex.`]} labelStyle={{ color: 'var(--ink)' }}/>
                      <Area type="monotone" dataKey="quantite" stroke="#C4907C" strokeWidth={2.5} fill="url(#gradTerra)" dot={{ fill: 'white', stroke: '#C4907C', strokeWidth: 2, r: 3.5 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {/* ── Livres ── */}
          {tab === 'livres' && (
            <div className={sty['livres-list']}>
              {loadingDetail ? (
                [1, 2, 3].map(i => (
                  <div key={i} style={{ height: 72, borderRadius: 14, background: 'linear-gradient(110deg,var(--cream-mid) 30%,var(--cream-dark) 50%,var(--cream-mid) 70%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
                ))
              ) : articles.length === 0 ? (
                <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Aucun livre associé à cet auteur.
                </p>
              ) : articles.map(({ article }, i) => (
                <div key={article.id} className={sty['livre-item']}>
                  <div className={sty['livre-cover']} style={{ background: COVER_GRADIENTS[i % COVER_GRADIENTS.length] }}>
                    {article.nom[0].toUpperCase()}
                  </div>
                  <div className={sty['livre-info']}>
                    <div className={sty['livre-nom']}>{article.nom}</div>
                    <div className={sty['livre-meta']}>
                      {article.isbn && <span>ISBN {article.isbn}</span>}
                      <span>{Number(article.prixVenteHT).toFixed(2)} € HT</span>
                      <span className={article.stock <= 0 ? sty['stock-vide'] : sty['stock-ok']}>
                        {article.stock > 0 ? `${article.stock} en stock` : 'Rupture'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Contrats ── */}
          {tab === 'contrats' && (
            <ContratsAuteurSection auteur={auteur} />
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
