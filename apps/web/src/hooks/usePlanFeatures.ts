import { getPlanFeatures, PLAN_LABELS, UPGRADE_MESSAGE, type PlanFeatures, type PlanTier } from '@megesti/shared'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'

export function usePlanFeatures() {
  const { data: tenant } = useMonTenant()
  const plan = (tenant?.plan ?? 'TRIAL') as PlanTier
  const features = getPlanFeatures(plan)

  function can(feature: keyof PlanFeatures): boolean {
    const val = features[feature]
    if (typeof val === 'boolean') return val
    if (typeof val === 'number' || val === null) return val === null || val > 0
    return val !== 'reseau'
  }

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    features,
    can,
    upgradeMessage: (feature: keyof PlanFeatures) => UPGRADE_MESSAGE[feature],
  }
}
