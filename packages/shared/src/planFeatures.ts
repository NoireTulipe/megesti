// ════════════════════════════════════════════════════════════════
// Plan features — source de vérité unique pour backend ET frontend
// ════════════════════════════════════════════════════════════════

export type PlanTier = 'TRIAL' | 'AUTO_EDITION' | 'EDITION' | 'EDITION_PRO'

export interface PlanFeatures {
  maxArticles:             number | null  // null = illimité
  maxUsers:                number | null
  auteurs:                 'reseau' | 'complet'
  contratsAuteurs:         boolean
  droitsAuteur:            boolean
  depotsLibraires:         boolean
  imprimeurs:              boolean
  reglagesAvances:         boolean
  charges:                 boolean
  reversements:            boolean
  stockAnalytics:          boolean
  facturationElectronique: boolean
  exportCsvPdf:            boolean
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  TRIAL: {
    maxArticles:             40,    maxUsers:                3,
    auteurs:                 'complet',
    contratsAuteurs:         true,  droitsAuteur:            true,
    depotsLibraires:         true,  imprimeurs:              true,
    reglagesAvances:         true,  charges:                 true,
    reversements:            true,  stockAnalytics:          true,
    facturationElectronique: false, exportCsvPdf:            true,
  },
  AUTO_EDITION: {
    maxArticles:             20,    maxUsers:                1,
    auteurs:                 'reseau',
    contratsAuteurs:         false, droitsAuteur:            false,
    depotsLibraires:         false, imprimeurs:              false,
    reglagesAvances:         false, charges:                 false,
    reversements:            false, stockAnalytics:          false,
    facturationElectronique: false, exportCsvPdf:            false,
  },
  EDITION: {
    maxArticles:             40,    maxUsers:                3,
    auteurs:                 'complet',
    contratsAuteurs:         true,  droitsAuteur:            true,
    depotsLibraires:         true,  imprimeurs:              true,
    reglagesAvances:         true,  charges:                 true,
    reversements:            true,  stockAnalytics:          true,
    facturationElectronique: true,  exportCsvPdf:            true,
  },
  EDITION_PRO: {
    maxArticles:             null,  maxUsers:                10,
    auteurs:                 'complet',
    contratsAuteurs:         true,  droitsAuteur:            true,
    depotsLibraires:         true,  imprimeurs:              true,
    reglagesAvances:         true,  charges:                 true,
    reversements:            true,  stockAnalytics:          true,
    facturationElectronique: true,  exportCsvPdf:            true,
  },
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  TRIAL:        'Essai gratuit',
  AUTO_EDITION: 'Auto-édition',
  EDITION:      'Edition',
  EDITION_PRO:  'Edition Pro',
}

export const UPGRADE_MESSAGE: Record<keyof PlanFeatures, string> = {
  imprimeurs:      'La gestion des imprimeurs est disponible à partir du plan Edition.',
  reglagesAvances: 'Les réglages avancés (champs personnalisés, thésaurus) sont disponibles à partir du plan Edition.',
  maxArticles:             'Augmentez votre quota en passant au plan Edition.',
  maxUsers:                'Ajoutez des collaborateurs en passant au plan Edition.',
  auteurs:                 'La gestion complète des auteurs est disponible à partir du plan Edition.',
  contratsAuteurs:         'Les contrats auteurs sont disponibles à partir du plan Edition.',
  droitsAuteur:            'La gestion des droits d\'auteur est disponible à partir du plan Edition.',
  depotsLibraires:         'Les dépôts libraires sont disponibles à partir du plan Edition.',
  charges:                 'La gestion des charges est disponible à partir du plan Edition.',
  reversements:            "L'encaissement par le point de vente et la gestion des reversements sont disponibles à partir du plan Edition.",
  stockAnalytics:          "Les graphiques d'analyse de stock sont disponibles à partir du plan Edition.",
  facturationElectronique: 'La facturation électronique est disponible à partir du plan Edition.',
  exportCsvPdf:            'L\'export CSV/PDF est disponible à partir du plan Edition.',
}

export function getPlanFeatures(plan: string): PlanFeatures {
  return PLAN_FEATURES[(plan as PlanTier)] ?? PLAN_FEATURES.TRIAL
}

export function canUseFeature(plan: string, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan)
  const val = features[feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val > 0
  return val !== null && val !== 'reseau'
}
