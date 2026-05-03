import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PointDeVente } from './hooks/usePointsDeVente'
import sty from '@/features/auteurs/AuteursPage.module.css'

type TabId = 'infos' | 'contacts' | 'reversements'

const TABS: { id: TabId; label: string; path: string }[] = [
  { id: 'infos',        label: 'Informations', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { id: 'contacts',     label: 'Contacts',     path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'reversements', label: 'Reversements', path: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
]

const PAIEMENT_LABELS: Record<string, string> = {
  VIREMENT: 'Virement', CHEQUE: 'Chèque',
}

interface Props {
  pdv:    PointDeVente
  isOpen: boolean
  onClose: () => void
  onEdit:  () => void
}

export function PointDeVenteDetail({ pdv, isOpen, onClose, onEdit }: Props) {
  const [tab, setTab] = useState<TabId>('infos')

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const commission = pdv.commissionPourcent
    ? `${Number(pdv.commissionPourcent)} %`
    : pdv.commissionFixe ? `${Number(pdv.commissionFixe).toFixed(2)} €` : null

  const GRADIENTS = [
    'linear-gradient(135deg,#3D5470,#5470A0)',
    'linear-gradient(135deg,#2A4A6A,#4A6A90)',
    'linear-gradient(135deg,#1E3A5F,#3A5F8A)',
    'linear-gradient(135deg,#304060,#506080)',
  ]
  const sum = [...pdv.nom].reduce((a, c) => a + c.charCodeAt(0), 0)
  const gradient = GRADIENTS[sum % GRADIENTS.length]

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

        {/* Header */}
        <div className={sty['detail-header']}>
          <div className={sty['detail-hero']}>
            <div className={sty['detail-avatar']} style={{ background: gradient, fontSize: '2rem' }}>
              🏪
            </div>
            <div className={sty['detail-hero-info']}>
              <div className={sty['detail-hero-name']}>{pdv.nom}</div>
              {pdv.categorie && (
                <div className={sty['detail-hero-civil']}>{pdv.categorie.nom}</div>
              )}
              <div className={sty['detail-hero-pills']}>
                <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-contrats']}`}>
                  {pdv.encaissementDirect ? 'Encaissement direct' : 'Via caisse PDV'}
                </span>
                {commission && (
                  <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-livres']}`}>
                    Commission {commission}
                  </span>
                )}
                {pdv.salon && (
                  <span className={sty['detail-hero-pill']}>
                    Salon : {pdv.salon.nom}
                  </span>
                )}
                {pdv.contacts.length > 0 && (
                  <span className={sty['detail-hero-pill']}>
                    {pdv.contacts.length} contact{pdv.contacts.length > 1 ? 's' : ''}
                  </span>
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

          {/* ── Informations ── */}
          {tab === 'infos' && (
            <div className={sty['profil-grid']}>
              <div className={sty['profil-field']}>
                <label>Nom</label>
                <span>{pdv.nom}</span>
              </div>
              <div className={sty['profil-field']}>
                <label>Catégorie</label>
                <span>{pdv.categorie?.nom ?? '—'}</span>
              </div>
              <div className={sty['profil-field']}>
                <label>Mode d'encaissement</label>
                <span>{pdv.encaissementDirect ? 'Direct (le PDV encaisse et reverse)' : 'Via notre caisse'}</span>
              </div>
              <div className={sty['profil-field']}>
                <label>Commission fixe</label>
                <span>{pdv.commissionFixe ? `${Number(pdv.commissionFixe).toFixed(2)} €` : '—'}</span>
              </div>
              <div className={sty['profil-field']}>
                <label>Commission (%)</label>
                <span>{pdv.commissionPourcent ? `${Number(pdv.commissionPourcent)} %` : '—'}</span>
              </div>
              {pdv.salon && (
                <div className={sty['profil-field']}>
                  <label>Salon associé</label>
                  <span>{pdv.salon.nom}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Contacts ── */}
          {tab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pdv.contacts.length === 0 && (
                <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Aucun contact renseigné pour ce point de vente.
                </p>
              )}
              {pdv.contacts.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', background: 'var(--cream)',
                  border: '1px solid var(--cream-dark)', borderRadius: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#3D5470,#5470A0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: "'DM Serif Display',serif", fontSize: '0.9rem',
                  }}>
                    {c.nom[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
                      {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {c.email     && <span>✉ {c.email}</span>}
                      {c.telephone && <span>☎ {c.telephone}</span>}
                      {c.typePaiement && (
                        <span style={{ background: 'var(--sage-light)', color: 'var(--sage)', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>
                          {PAIEMENT_LABELS[c.typePaiement] ?? c.typePaiement}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: 8, fontStyle: 'italic' }}>
                Pour modifier les contacts, utilisez le bouton "Modifier" ci-dessus.
              </p>
            </div>
          )}

          {/* ── Reversements ── */}
          {tab === 'reversements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '20px 24px', background: 'var(--cream)',
                border: '1px solid var(--cream-dark)', borderRadius: 16,
                display: 'flex', alignItems: 'center', gap: 24,
              }}>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: '0.85rem', color: 'var(--text-soft)', marginBottom: 4 }}>
                    Reversements
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                    Consultez la page <strong>Reversements</strong> pour le suivi détaillé des paiements
                    en attente et encaissés pour ce point de vente.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
