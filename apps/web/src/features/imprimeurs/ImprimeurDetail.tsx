import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Imprimeur } from './hooks/useImprimeurs'
import sty from '@/features/auteurs/AuteursPage.module.css'

type TabId = 'infos' | 'contacts'

const TABS: { id: TabId; label: string; path: string }[] = [
  { id: 'infos',    label: 'Informations', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { id: 'contacts', label: 'Contacts',     path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
]

const GRADIENTS = [
  'linear-gradient(135deg,#C4907C,#D4A070)',
  'linear-gradient(135deg,#C9933A,#D4A855)',
  'linear-gradient(135deg,#6B8F71,#85A88A)',
  'linear-gradient(135deg,#8B7BAB,#A090C0)',
]

interface Props {
  imprimeur: Imprimeur
  isOpen:    boolean
  onClose:   () => void
  onEdit:    () => void
}

export function ImprimeurDetail({ imprimeur, isOpen, onClose, onEdit }: Props) {
  const [tab, setTab] = useState<TabId>('infos')

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sum      = [...imprimeur.nom].reduce((a, c) => a + c.charCodeAt(0), 0)
  const gradient = GRADIENTS[sum % GRADIENTS.length]

  const Tag = ({ label, green }: { label: string; green: boolean }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
      background: green ? '#dcfce7' : '#fee2e2',
      color:      green ? '#166534' : '#991b1b',
      border:     `1px solid ${green ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      {green
        ? <ThumbsUp  size={11} color="#16a34a" />
        : <ThumbsDown size={11} color="#dc2626" />
      }
      {label}
    </span>
  )

  return createPortal(
    <div className={sty.backdrop} onClick={onClose}>
      <div
        className={`${sty.modal} ${sty['modal-xl']}`}
        style={{ display: 'flex', flexDirection: 'column', maxWidth: 780 }}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <button className={sty['modal-close']} onClick={onClose} aria-label="Fermer">✕</button>

        {/* Header */}
        <div className={sty['detail-header']}>
          <div className={sty['detail-hero']}>
            <div className={sty['detail-avatar']} style={{ background: gradient, fontSize: '2rem' }}>
              🖨️
            </div>
            <div className={sty['detail-hero-info']}>
              <div className={sty['detail-hero-name']}>{imprimeur.nom}</div>
              <div className={sty['detail-hero-pills']}>
                {imprimeur.pointsForts.length > 0 && (
                  <span className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-contrats']}`}>
                    {imprimeur.pointsForts.length} point{imprimeur.pointsForts.length > 1 ? 's' : ''} fort{imprimeur.pointsForts.length > 1 ? 's' : ''}
                  </span>
                )}
                {imprimeur.contacts.length > 0 && (
                  <span className={sty['detail-hero-pill']}>
                    {imprimeur.contacts.length} contact{imprimeur.contacts.length > 1 ? 's' : ''}
                  </span>
                )}
                {imprimeur.lienCommande && (
                  <a
                    href={imprimeur.lienCommande}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${sty['detail-hero-pill']} ${sty['detail-hero-pill-email']}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={11} />
                    Commander en ligne
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Points forts / faibles */}
              {(imprimeur.pointsForts.length > 0 || imprimeur.pointsFaibles.length > 0) && (
                <div style={{ display: 'flex', gap: 24 }}>
                  {imprimeur.pointsForts.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)', marginBottom: 10 }}>
                        Points forts
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {imprimeur.pointsForts.map((p, i) => <Tag key={i} label={p} green />)}
                      </div>
                    </div>
                  )}
                  {imprimeur.pointsFaibles.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)', marginBottom: 10 }}>
                        Points faibles
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {imprimeur.pointsFaibles.map((p, i) => <Tag key={i} label={p} green={false} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note libre */}
              {imprimeur.noteLibre && (
                <div className={sty['profil-field']} style={{ gridColumn: '1/-1' }}>
                  <label>Note</label>
                  <span style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{imprimeur.noteLibre}</span>
                </div>
              )}

              {/* Lien commande */}
              {imprimeur.lienCommande && (
                <div className={sty['profil-field']}>
                  <label>Lien de commande</label>
                  <a
                    href={imprimeur.lienCommande}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--terra-dark)', fontSize: '0.88rem' }}
                  >
                    <ExternalLink size={14} />
                    {imprimeur.lienCommande}
                  </a>
                </div>
              )}

              {!imprimeur.noteLibre && !imprimeur.lienCommande && imprimeur.pointsForts.length === 0 && imprimeur.pointsFaibles.length === 0 && (
                <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Aucune information complémentaire renseignée.
                </p>
              )}
            </div>
          )}

          {/* ── Contacts ── */}
          {tab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {imprimeur.contacts.length === 0 && (
                <p style={{ color: 'var(--text-soft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Aucun contact renseigné pour cet imprimeur.
                </p>
              )}
              {imprimeur.contacts.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', background: 'var(--cream)',
                  border: '1px solid var(--cream-dark)', borderRadius: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: "'DM Serif Display',serif", fontSize: '0.95rem',
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
                    </div>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: 8, fontStyle: 'italic' }}>
                Pour modifier les contacts, utilisez le bouton "Modifier" ci-dessus.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
