export const ENTITY_TYPES = [
  'auteur',
  'livre',
  'maisonEdition',
  'depotLibraire',
  'salon',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
