import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Article } from './types'
import sty from '@/features/auteurs/AuteursPage.module.css'

interface Props {
  article:  Article
  isOpen:   boolean
  onClose:  () => void
  onEdit:   () => void
  onToggle: (actif: boolean) => void
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtEuro = (v: string | number | null) =>
  v != null ? `${Number(v).toFixed(2)} €` : '—'

export function ArticleDetail({ article, isOpen, onClose, onEdit, onToggle }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const retire       = !article.actif
  const stockCouleur = article.stock <= article.stockAlerte
    ? '#DC2626'
    : article.stock <= article.stockTension ? '#D97706' : '#059669'

  // Gradient cover basé sur le rayon
  const COVERS = [
    'linear-gradient(160deg,#C4907C,#8B7BAB)',
    'linear-gradient(160deg,#8B7BAB,#6B8F71)',
    'linear-gradient(160deg,#C9933A,#C4907C)',
    'linear-gradient(160deg,#6B8F71,#5B6E8A)',
    'linear-gradient(160deg,#5B6E8A,#C9933A)',
  ]
  const coverGradient = COVERS[article.nom.charCodeAt(0) % COVERS.length]

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

            {/* Couverture */}
            <div style={{
              width: 80, height: 110, borderRadius: 8, flexShrink: 0,
              background: article.imageUrl ? undefined : coverGradient,
              boxShadow: '0 6px 20px rgba(44,24,16,0.20)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {article.imageUrl
                ? <img src={article.imageUrl} alt={article.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        </div>

        {/* ── Corps ── */}
        <div className={sty['detail-body']}>
          <div className={sty['profil-grid']}>

            {/* Prix */}
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

            {/* Stock */}
            <div className={sty['profil-field']}>
              <label>Stock actuel</label>
              <span style={{ color: stockCouleur, fontWeight: 700 }}>{article.stock} exemplaire{article.stock !== 1 ? 's' : ''}</span>
            </div>

            <div className={sty['profil-field']}>
              <label>Seuils d'alerte</label>
              <span>Alerte : {article.stockAlerte} · Tension : {article.stockTension}</span>
            </div>

            {/* Publication */}
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

            {/* Auteurs */}
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

            {/* Description */}
            {article.description && (
              <div className={sty['profil-field']} style={{ gridColumn: '1/-1' }}>
                <label>Description</label>
                <span style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{article.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
