/**
 * Helpers de date pour les champs `<input type="date">` (format YYYY-MM-DD).
 *
 * Règle : toujours raisonner en date **locale**, jamais via `toISOString()`.
 * `new Date().toISOString().slice(0, 10)` renvoie la date UTC — entre 00 h et
 * 02 h heure de Paris en été, c'est la veille. Anodin sur un filtre, faux sur
 * une date d'émission de facture ou de signature de contrat.
 */

/** Date locale d'un objet Date au format YYYY-MM-DD. */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Aujourd'hui, en date locale, au format YYYY-MM-DD. */
export function todayISO(): string {
  return toLocalISO(new Date())
}

/** Aujourd'hui décalé de `days` jours (négatif accepté), en date locale. */
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return toLocalISO(d)
}

/** Aujourd'hui décalé de `months` mois (négatif accepté), en date locale. */
export function addMonthsISO(months: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return toLocalISO(d)
}

/** Aujourd'hui décalé de `years` années (négatif accepté), en date locale. */
export function addYearsISO(years: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setFullYear(d.getFullYear() + years)
  return toLocalISO(d)
}

/**
 * Tronque un datetime ISO renvoyé par l'API (`2026-08-18T00:00:00.000Z`) à sa
 * partie date, pour alimenter un `<input type="date">`.
 */
export function isoToInput(iso: string): string {
  return iso.split('T')[0] ?? iso
}
