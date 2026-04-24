import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { QuickActionData } from './data'

interface QuickBtnProps extends QuickActionData {
  onClick: () => void
}

export function QuickBtn({ label, iconName, color, bgColor, sub, onClick }: QuickBtnProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '16px 18px',
        borderRadius: 20,
        border: 'none',
        background: hovered ? color : bgColor,
        cursor: 'pointer',
        flex: 1,
        boxShadow: hovered ? `0 8px 24px ${color}35` : '0 2px 8px rgba(28,58,94,0.05)',
        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        transform: pressed ? 'scale(0.96)' : hovered ? 'translateY(-2px) scale(1.02)' : 'scale(1)',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12, marginBottom: 10,
        background: hovered ? 'rgba(255,255,255,0.2)' : `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        <Icon name={iconName} size={17} color={hovered ? 'white' : color} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: hovered ? 'white' : color, lineHeight: 1.2 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: hovered ? 'rgba(255,255,255,0.65)' : 'var(--text-soft)', marginTop: 3 }}>
          {sub}
        </div>
      )}
    </button>
  )
}
