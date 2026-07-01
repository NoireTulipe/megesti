/**
 * Helpers de fusion serveur + delta local pour le pipeline offline-first.
 *
 * Principe : le serveur est la source de vérité ; on y ajoute le « delta local »
 * (les lignes `synced = 0`, c-à-d pas encore remontées au serveur) sans jamais
 * double-compter ce qui est déjà synchronisé.
 *
 * Deux stratégies selon l'endpoint lu :
 *  - Fusion par UUID  : quand l'API renvoie les lignes individuelles avec leur id.
 *  - Fusion d'agrégats : quand l'API ne renvoie que des sommes (pas d'UUID).
 */

// ── Types minimaux partagés ──────────────────────────────────────────────

/** Une vente identifiée par son UUID (forme serveur / forme locale normalisée). */
export interface MergeableVente {
  id: string
  totalTTC: number
  modePaiement: string
  dateVente: string
  statut?: string
  lignes?: { nom?: string; quantite: number; totalTTC?: number; prixUnitaireHT?: number }[]
}

/** Agrégats de bilan, dans la forme retournée par GET /rapports/ventes. */
export interface BilanAggregate {
  ca: number
  venteCount: number
  parMode: { mode: string; ca: number; count: number }[]
  topArticles: { nom: string; qty: number; ca: number }[]
  parPdv: { nom: string; ca: number; count: number }[]
}

// ── 1. Fusion par UUID ───────────────────────────────────────────────────

/**
 * Union de deux listes de ventes, dédupliquée par `id`.
 * En cas de doublon, la vente locale (delta) prévaut : elle est plus fraîche.
 *
 * NB : NE filtre pas les ventes annulées — la déduplication n'a pas à décider
 * ce qui s'affiche. Les ANNULEE sont conservées (elles doivent rester visibles,
 * en grisé, dans la liste paniers). C'est aux calculs (CA, coût, agrégations)
 * d'ignorer `statut === 'ANNULEE'`.
 */
export function mergeVentesByUuid<T extends MergeableVente>(server: T[], localDelta: T[]): T[] {
  const merged = new Map<string, T>()
  for (const v of server) {
    merged.set(v.id, v)
  }
  for (const v of localDelta) {
    merged.set(v.id, v) // le delta écrase : pas encore sur le serveur, donc neuf
  }
  return Array.from(merged.values())
}

// ── 2. Fusion d'agrégats ─────────────────────────────────────────────────

/**
 * Additionne deux bilans agrégés en sommant `ca` et `venteCount`, et en
 * fusionnant `parMode` / `topArticles` / `parPdv` par clé (somme puis re-tri).
 *
 * Usage type : `mergeBilanAggregates(serverData, localDelta)`.
 * Le delta local ne contient QUE les ventes non synchronisées, il n'y a donc
 * pas de risque de double-compte tant que le flag `synced` est fiable.
 */
export function mergeBilanAggregates(server: BilanAggregate, delta: BilanAggregate): BilanAggregate {
  return {
    ca:          server.ca + delta.ca,
    venteCount:  server.venteCount + delta.venteCount,
    parMode:     mergeByKey(server.parMode, delta.parMode, 'mode'),
    topArticles: mergeByKey(server.topArticles, delta.topArticles, 'nom'),
    parPdv:      mergeByKey(server.parPdv, delta.parPdv, 'nom'),
  }
}

// ── Utilitaire interne : fusion par clé avec somme des champs numériques ──

type KeyedRow = { [k: string]: string | number }

function mergeByKey<Row extends KeyedRow>(
  a: Row[],
  b: Row[],
  key: keyof Row & string,
): Row[] {
  const acc = new Map<string, Row>()
  for (const row of [...a, ...b]) {
    const k = String(row[key])
    const prev = acc.get(k)
    if (!prev) {
      acc.set(k, { ...row })
    } else {
      // Somme de tous les champs numériques (ca, count, qty...), clé préservée.
      const merged: Row = { ...prev }
      for (const field in row) {
        if (field === key) continue
        const val = row[field]
        if (typeof val === 'number') {
          ;(merged as KeyedRow)[field] = (Number(prev[field]) || 0) + val
        }
      }
      acc.set(k, merged)
    }
  }
  // Re-tri par CA décroissant (convention des écrans de bilan).
  return Array.from(acc.values()).sort((x, y) => Number(y['ca']) - Number(x['ca']))
}
