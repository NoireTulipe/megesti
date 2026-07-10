/** Types de frais — aligné sur l'enum serveur (routes/frais.ts). */
export const FRAIS_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'DEPLACEMENT', label: 'Déplacement', emoji: '🚗' },
  { value: 'REPAS',       label: 'Repas',       emoji: '🍽️' },
  { value: 'HEBERGEMENT', label: 'Hébergement', emoji: '🏨' },
  { value: 'STAND',       label: 'Stand',       emoji: '🏪' },
  { value: 'DON',         label: 'Don',         emoji: '🎁' },
  { value: 'PERTE_STOCK', label: 'Perte stock', emoji: '📉' },
  { value: 'AUTRE',       label: 'Autre',       emoji: '📋' },
]

export function fraisLabel(type: string): string {
  return FRAIS_TYPES.find(t => t.value === type)?.label ?? type
}

export function fraisEmoji(type: string): string {
  return FRAIS_TYPES.find(t => t.value === type)?.emoji ?? '📋'
}
