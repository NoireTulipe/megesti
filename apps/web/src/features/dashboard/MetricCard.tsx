import { ArrowUp } from 'lucide-react'
import { useCounter } from '@/hooks/useCounter'
import { Sparkline } from '@/components/charts/Sparkline'
import type { MetricData } from './data'
import styles from './MetricCard.module.css'

interface MetricCardProps extends MetricData {
  delay?: number
  large?: boolean
}

export function MetricCard({
  label, rawValue, unit, trend, trendLabel, sparkData,
  color, accent, delay = 0, large,
}: MetricCardProps) {
  const isPositive = trend >= 0
  const counted = useCounter(rawValue, 900, delay + 200)

  return (
    <div
      className={`${styles.card} ${large ? styles.large : ''}`}
      style={large ? { background: `linear-gradient(135deg, ${color} 0%, ${accent} 100%)` } : undefined}
    >
      <svg className={`${styles.blob} ${large ? styles.largeBlobOpacity : ''}`} width="160" height="160" viewBox="0 0 160 160">
        <path
          d="M80,10 C120,10 150,40 150,80 C150,115 130,148 90,152 C50,156 10,130 10,90 C10,50 40,10 80,10 Z"
          fill={large ? 'white' : color}
        />
      </svg>
      {large && (
        <svg className={styles.blobArc} width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="white" strokeWidth="40" />
        </svg>
      )}

      <div className={styles.inner}>
        <div className={styles.label} style={{ color: large ? 'rgba(255,255,255,0.7)' : 'var(--text-soft)' }}>
          {label}
        </div>

        <div className={styles.valueRow}>
          <span
            className={styles.value}
            style={{ fontSize: large ? 58 : 40, color: large ? 'white' : 'var(--ink)' }}
          >
            {counted.toLocaleString('fr-FR')}
          </span>
          {unit && (
            <span
              className={styles.unit}
              style={{
                fontSize: large ? 22 : 16,
                color: large ? 'rgba(255,255,255,0.7)' : 'var(--text-mid)',
                marginBottom: large ? 8 : 4,
              }}
            >
              {unit}
            </span>
          )}
        </div>

        <div className={styles.footer}>
          <div
            className={`${styles.badge} ${isPositive ? styles.badgePositive : styles.badgeNegative}`}
            style={large ? { background: isPositive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' } : undefined}
          >
            <span style={{ display: 'flex', transform: isPositive ? 'none' : 'rotate(180deg)' }}>
              <ArrowUp size={12} color={large ? 'white' : isPositive ? 'var(--sage)' : '#E05252'} />
            </span>
            <span className={styles.trendLabel} style={{ color: large ? 'white' : isPositive ? 'var(--sage)' : '#E05252' }}>
              {trendLabel}
            </span>
            <span className={styles.trendVs} style={{ color: large ? 'rgba(255,255,255,0.55)' : 'var(--text-soft)' }}>
              vs mars
            </span>
          </div>

          {sparkData && !large && <Sparkline data={sparkData} positive={isPositive} />}
        </div>
      </div>
    </div>
  )
}
