/**
 * Saisie et affichage des montants.
 *
 * En France on tape « 4,56 », pas « 4.56 ». Toute saisie numerique doit donc
 * accepter la virgule decimale — la refuser bloquait l'enregistrement d'un
 * article sans message d'erreur comprehensible.
 */

/**
 * Normalise une saisie numerique francaise vers un format que `Number()`
 * comprend : virgule decimale, espaces de milliers (y compris insecables),
 * symbole euro eventuel. Renvoie `undefined` pour une saisie vide.
 *
 * Pense pour etre branche dans un `z.preprocess()`.
 */
export function normaliserNombreFr(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const nettoye = v
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/€/g, '')
    .replace(',', '.')
    .trim()
  return nettoye === '' ? undefined : nettoye
}

/** Parse un montant saisi par l'utilisateur. `NaN` si la saisie est invalide. */
export function parsePrice(value: string | number): number {
  if (typeof value === 'number') return value
  const n = normaliserNombreFr(value)
  return typeof n === 'string' ? parseFloat(n) : NaN
}

/** Formate un montant en euros, format francais. */
export function formatPrice(value: string | number): string {
  const n = typeof value === 'string' ? parsePrice(value) : value
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
