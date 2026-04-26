export const ENTITY_TYPES = [
  'auteur',
  'maisonEdition',
  'depotLibraire',
  'salon',
  'pointDeVente',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
