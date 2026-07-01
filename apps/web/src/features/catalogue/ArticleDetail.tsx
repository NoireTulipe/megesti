import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getImageUrl } from '@/lib/api'
import type { Article } from './types'
import { useVentesStatsArticle } from './hooks/useVentesStatsArticle'
import { useUpdateArticle } from './hooks/useArticles'
import { fetchBnfIsbn } from './hooks/useBnfLookup'
import { HelpButton } from '@/components/HelpButton'
import sty from '@/features/auteurs/AuteursPage.module.css'

interface Props {
  article:  Article
  isOpen:   boolean
  onClose:  () => void
  onEdit:   () => void
  onToggle: (actif: boolean) => void
}

type TabId = 'profil' | 'ventes'
type Period = 1 | 3 | 12

const TABS: { id: TabId; label: string; path: string }[] = [
  { id: 'profil', label: 'Profil', path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'ventes', label: 'Ventes', path: 'M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3' },
]

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtEuro = (v: string | number | null) =>
  v != null ? `${Number(v).toFixed(2)} €` : '—'

export function ArticleDetail({ article, isOpen, onClose, onEdit, onToggle }: Props) {
  const [tab, setTab]         = useState<TabId>('profil')
  const [period, setPeriod]   = useState<Period>(12)
  const [bnfDeclaree, setBnfDeclaree]     = useState(article.bnfDeclaree)
  const [bnfChecking, setBnfChecking]     = useState(false)
  const [bnfCheckError, setBnfCheckError] = useState(false)
  const updateArticle = useUpdateArticle()
  const bnfCheckedRef = useRef(false)

  // Sync si le parent rafraîchit l'article (ex: après mutateAsync)
  useEffect(() => { setBnfDeclaree(article.bnfDeclaree) }, [article.bnfDeclaree])

  const { data: stats, isLoading: loadingStats } = useVentesStatsArticle(
    isOpen && tab === 'ventes' ? article.id : undefined,
    period,
  )

  useEffect(() => {
    if (!isOpen) { setTab('profil'); return }
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  // Auto-vérification BNF à l'ouverture — une seule fois par session modale
  useEffect(() => {
    if (!isOpen) { bnfCheckedRef.current = false; return }
    if (!article.isbn || article.bnfDeclaree || bnfCheckedRef.current) return
    bnfCheckedRef.current = true
    const isbnNorm = article.isbn.replace(/[-\s]/g, '')
    setBnfChecking(true)
    fetchBnfIsbn(isbnNorm)
      .then(result => {
        if (result) {
          updateArticle.mutate({ id: article.id, bnfDeclaree: true })
          setBnfDeclaree(true)
        }
      })
      .catch(() => { setBnfCheckError(true) })
      .finally(() => setBnfChecking(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, article.id])

  const checkBnfManuel = async () => {
    if (!article.isbn || bnfChecking) return
    const isbnNorm = article.isbn.replace(/[-\s]/g, '')
    setBnfChecking(true)
    setBnfCheckError(false)
    try {
      const result = await fetchBnfIsbn(isbnNorm)
      if (result) {
        await updateArticle.mutateAsync({ id: article.id, bnfDeclaree: true })
        setBnfDeclaree(true)
      }
    } catch { setBnfCheckError(true) } finally {
      setBnfChecking(false)
    }
  }

  if (!isOpen) return null

  const retire       = !article.actif
  const stockCouleur = article.stock <= article.stockAlerte
    ? '#DC2626'
    : article.stock <= article.stockTension ? '#D97706' : '#059669'

  const COVERS = [
    'linear-gradient(160deg,#C4907C,#8B7BAB)',
    'linear-gradient(160deg,#8B7BAB,#6B8F71)',
    'linear-gradient(160deg,#C9933A,#C4907C)',
    'linear-gradient(160deg,#6B8F71,#5B6E8A)',
    'linear-gradient(160deg,#5B6E8A,#C9933A)',
  ]
  const coverGradient = COVERS[article.nom.charCodeAt(0) % COVERS.length]

  const months   = stats?.months ?? []
  const totalQte = useMemo(() => months.reduce((s, m) => s + m.quantite, 0), [months])
  const totalHT  = useMemo(() => months.reduce((s, m) => s + m.totalHT, 0), [months])

  return createPortal(
    <div className={sty.backdrop} onClick={onClose}>
      <div
        className={`${sty.modal} ${sty['modal-xl']}`}
        style={{ display: 'flex', flexDirection: 'column', maxWidth: 860 }}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <button className={sty['modal-close']} onClick={onClose} aria-label="Fermer">✕</button>

        {/* ── Header ── */}
        <div className={sty['detail-header']}>
          <div className={sty['detail-hero']}>
            <div style={{
              width: 80, height: 110, borderRadius: 8, flexShrink: 0,
              background: article.imageUrl ? undefined : coverGradient,
              boxShadow: '0 6px 20px rgba(44,24,16,0.20)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {article.imageUrl
                ? <img src={getImageUrl(article.imageUrl)!} alt={article.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.6rem', color: '#fff', fontStyle: 'italic' }}>
                    {article.nom[0].toUpperCase()}
                  </span>
              }
            </div>

            <div className={sty['detail-hero-info']}>
              <div className={sty['detail-hero-name']}>{article.nom}</div>
              {article.reference && (
                <div className={sty['detail-hero-civil']}>Réf. {article.reference}</div>
              )}
              <div className={sty['detail-hero-pills']}>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-livres']}`}>
                  {article.rayon.nom}{article.categorie ? ` › ${article.categorie.nom}` : ''}
                </span>
                {article.isbn && (
                  <span className={sty['detail-hero-pill']}>ISBN {article.isbn}</span>
                )}
                <span className={sty['detail-hero-pill']} style={{ color: stockCouleur, fontWeight: 700 }}>
                  {article.stock} en stock
                </span>
                {retire && (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '2px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                    Retiré
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, marginRight: 48 }}>
              <button className={sty['detail-edit-btn']} onClick={onEdit}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Modifier
              </button>
              <button
                onClick={() => { onToggle(!article.actif); onClose() }}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 99,
                  border: retire ? '1.5px solid #6B8F71' : '1.5px solid #FECACA',
                  background: retire ? 'rgba(107,143,113,0.1)' : '#FEF2F2',
                  color: retire ? '#3A6040' : '#DC2626',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {retire ? '↩ Remettre au catalogue' : '✕ Retirer'}
              </button>
            </div>
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

        {/* ── Corps ── */}
        <div className={sty['detail-body']}>
          {tab === 'profil' && (
            <div className={sty['profil-grid']}>

              <div className={sty['profil-field']}>
                <label>Prix de vente HT</label>
                <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.3rem', color: 'var(--ink)' }}>
                  {fmtEuro(article.prixVenteHT)}
                </span>
              </div>

              <div className={sty['profil-field']}>
                <label>TVA applicable</label>
                <span>{Number(article.rayon.tauxTVA)} %</span>
              </div>

              {article.prixAchatHT && (
                <div className={sty['profil-field']}>
                  <label>Prix d'achat HT</label>
                  <span>{fmtEuro(article.prixAchatHT)}</span>
                </div>
              )}

              {article.prixAchatLotHT && article.prixAchatLotQte && (
                <div className={sty['profil-field']}>
                  <label>Achat en lot</label>
                  <span>{fmtEuro(article.prixAchatLotHT)} / {article.prixAchatLotQte} ex.</span>
                </div>
              )}

              <div className={sty['profil-field']}>
                <label>Stock actuel</label>
                <span style={{ color: stockCouleur, fontWeight: 700 }}>{article.stock} exemplaire{article.stock !== 1 ? 's' : ''}</span>
              </div>

              <div className={sty['profil-field']}>
                <label>Seuils d'alerte</label>
                <span>Alerte : {article.stockAlerte} · Tension : {article.stockTension}</span>
              </div>

              {article.datePublication && (
                <div className={sty['profil-field']}>
                  <label>Date de publication</label>
                  <span>{fmtDate(article.datePublication)}</span>
                </div>
              )}

              {article.imprimeur && (
                <div className={sty['profil-field']}>
                  <label>Imprimeur</label>
                  <span>{article.imprimeur.nom}</span>
                </div>
              )}

              {article.auteurs.length > 0 && (
                <div className={sty['profil-field']} style={{ gridColumn: '1/-1' }}>
                  <label>Auteur{article.auteurs.length > 1 ? 's' : ''}</label>
                  <span>
                    {article.auteurs.map(aa =>
                      aa.auteur.pseudonyme ?? `${aa.auteur.prenom} ${aa.auteur.nom}`
                    ).join(' · ')}
                  </span>
                </div>
              )}

              {article.description && (
                <div className={sty['profil-field']} style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <span style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{article.description}</span>
                </div>
              )}

              {article.rayon.isLibrairie && (
                <div className={sty['profil-field']} style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Dépôt légal BNF
                    <HelpButton slug="article-bnf-declaration" size="sm" />
                  </label>
                  {!article.isbn ? (
                    <span style={{ color: 'var(--text-soft)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      ISBN non renseigné — impossible de vérifier le référencement BNF.
                    </span>
                  ) : bnfChecking ? (
                    <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                      Vérification dans le catalogue BNF…
                    </span>
                  ) : bnfDeclaree ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.88rem' }}>✓ Référencé dans le catalogue BNF</span>
                      <button
                        onClick={async () => {
                          await updateArticle.mutateAsync({ id: article.id, bnfDeclaree: false })
                          setBnfDeclaree(false)
                          setBnfCheckError(false)
                        }}
                        style={{ fontSize: '0.72rem', color: 'var(--text-soft)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      >
                        Corriger
                      </button>
                    </span>
                  ) : bnfCheckError ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#D97706', fontWeight: 600, fontSize: '0.85rem' }}>Vérification impossible — catalogue BNF inaccessible</span>
                      <button
                        onClick={checkBnfManuel}
                        style={{
                          height: 28, padding: '0 12px', borderRadius: 99,
                          border: '1.5px solid #6B8F71', background: 'rgba(107,143,113,0.07)',
                          color: '#3A6040', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Réessayer
                      </button>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#D97706', fontWeight: 600, fontSize: '0.85rem' }}>Absent du catalogue BNF — dépôt légal à effectuer</span>
                      <button
                        onClick={checkBnfManuel}
                        style={{
                          height: 28, padding: '0 12px', borderRadius: 99,
                          border: '1.5px solid #6B8F71', background: 'rgba(107,143,113,0.07)',
                          color: '#3A6040', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Revérifier
                      </button>
                      <a
                        href="https://depotlegal.bnf.fr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.78rem', color: 'var(--terra)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Portail dépôt légal BNF →
                      </a>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

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
                        <linearGradient id="gradArticle" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C4907C" stopOpacity={0.28}/>
                          <stop offset="100%" stopColor="#C4907C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4,3" stroke="#E2D5CA" vertical={false}/>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8C7066' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 10, fill: '#8C7066' }} axisLine={false} tickLine={false} width={28}/>
                      <Tooltip formatter={(v: number) => [`${v} ex.`]} labelStyle={{ color: 'var(--ink)' }}/>
                      <Area type="monotone" dataKey="quantite" stroke="#C4907C" strokeWidth={2.5} fill="url(#gradArticle)" dot={{ fill: 'white', stroke: '#C4907C', strokeWidth: 2, r: 3.5 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
