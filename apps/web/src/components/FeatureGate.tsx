import type { PlanFeatures } from '@megesti/shared'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'

interface FeatureGateProps {
  feature: keyof PlanFeatures
  children: React.ReactNode
  tooltip?: string
  /** Si true, cache complètement au lieu de griser */
  hide?: boolean
}

/**
 * Enveloppe un élément UI dans un gate de plan.
 * Si la feature est bloquée : grise l'élément + tooltip au survol.
 * Usage : <FeatureGate feature="contratsAuteurs"><MonComposant /></FeatureGate>
 */
export function FeatureGate({ feature, children, tooltip, hide = false }: FeatureGateProps) {
  const { can, upgradeMessage } = usePlanFeatures()

  if (can(feature)) return <>{children}</>
  if (hide) return null

  const message = tooltip ?? upgradeMessage(feature)

  return (
    <div
      title={message}
      style={{
        opacity:        0.4,
        cursor:         'not-allowed',
        pointerEvents:  'none',
        userSelect:     'none',
        position:       'relative',
        display:        'contents',
      }}
    >
      {children}
    </div>
  )
}

/** Version pour les items de navigation de la sidebar */
export function NavFeatureGate({
  feature,
  children,
  tooltip,
}: {
  feature: keyof PlanFeatures
  children: React.ReactNode
  tooltip?: string
}) {
  const { can, upgradeMessage } = usePlanFeatures()

  if (can(feature)) return <>{children}</>

  const message = tooltip ?? upgradeMessage(feature)

  return (
    <div
      title={message}
      style={{
        opacity:       0.35,
        cursor:        'not-allowed',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}
