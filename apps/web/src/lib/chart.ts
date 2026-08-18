/**
 * Helpers Recharts.
 *
 * Depuis Recharts v3, le `formatter` d'un `<Tooltip>` reçoit un `ValueType`
 * (`string | number | (string | number)[]`) et non un `number`. Annoter le
 * paramètre `(v: number)` ne compile donc plus. On laisse TypeScript inférer
 * le type réel et on normalise la valeur ici.
 */

/** Normalise une valeur de tooltip Recharts en nombre exploitable. */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  if (Array.isArray(v)) return toNumber(v[0])
  return 0
}
