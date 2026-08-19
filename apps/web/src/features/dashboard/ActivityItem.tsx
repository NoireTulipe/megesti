import { useState, useEffect } from 'react'
import type { ActivityData } from './data'

type Props = ActivityData & { index: number }

export function ActivityItem({ initials, color, modePaiement, premierArticle, totalTTC, time, detail, isLast, index }: Props) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60 + 200)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 14,
        paddingBottom: isLast ? 0 : 16,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.4s, transform 0.4s',
      }}
    >
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 700,
          boxShadow: hovered ? '0 4px 14px rgba(28,58,94,0.25)' : 'none',
          transition: 'box-shadow 0.25s, transform 0.25s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          zIndex: 1,
        }}>
          {initials}
        </div>
        {!isLast && (
          <div style={{
            width: 1.5, flex: 1, marginTop: 6,
            background: 'linear-gradient(to bottom, rgba(28,58,94,0.12), transparent)',
            minHeight: 12,
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: hovered ? 'var(--ink)' : 'var(--text)', transition: 'color 0.2s' }}>
          Vente · <strong>{modePaiement}</strong>
          {premierArticle && <> — <em>{premierArticle}</em></>}
          {' — '}{totalTTC.toFixed(2)} €
        </div>
        {detail && (
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2, fontStyle: 'italic' }}>{detail}</div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {time}
        </div>
      </div>
    </div>
  )
}
