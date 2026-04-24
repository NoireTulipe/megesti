import { useState, useEffect } from 'react'
import { Icon } from '@/components/Icon'
import type { AlertData } from './data'

interface AlertItemProps extends AlertData {
  index: number
}

export function AlertItem({ iconName, text, sub, index }: AlertItemProps) {
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80 + 100)
    return () => clearTimeout(t)
  }, [index])

  if (dismissed) return null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        background: hovered ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)',
        borderRadius: 16,
        marginBottom: 8,
        border: '1px solid rgba(217,95,59,0.12)',
        transition: 'all 0.25s',
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        opacity: visible ? 1 : 0,
        boxShadow: hovered ? '0 4px 20px rgba(217,95,59,0.08)' : 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--terra-light), rgba(242,180,158,0.4))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--terra)', border: '1px solid rgba(217,95,59,0.15)',
      }}>
        <Icon name={iconName} size={15} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5C1A08', lineHeight: 1.4 }}>{text}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--terra)', marginTop: 3, opacity: 0.75 }}>{sub}</div>}
      </div>

      <button
        onClick={() => setDismissed(true)}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--terra)', opacity: hovered ? 0.6 : 0,
          transition: 'opacity 0.2s', fontSize: 18, lineHeight: 1,
          padding: '0 2px', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
