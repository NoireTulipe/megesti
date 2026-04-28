import type {
  ContexteVente, FormuleDA, LigneVenteDA,
  RegleDA, ResultatRoyalties,
} from './types.js'

function conditionCorrespond(regle: RegleDA, ctx: ContexteVente): boolean {
  const c = regle.conditions
  if (c.vendeur        !== undefined && c.vendeur        !== ctx.vendeur)        return false
  if (c.avecCommission !== undefined && c.avecCommission !== ctx.avecCommission) return false
  if (c.typeVente      !== undefined && c.typeVente      !== ctx.typeVente)       return false
  return true
}

/**
 * Trouve la première règle dont les conditions correspondent au contexte.
 * Retourne null si aucune règle ne correspond (formule mal configurée).
 */
export function evaluateDA(formule: FormuleDA, contexte: ContexteVente): RegleDA | null {
  return formule.lignes.find((r) => conditionCorrespond(r, contexte)) ?? null
}

/**
 * Calcule les droits d'auteur pour un ensemble de lignes de vente.
 *
 * @param lignes       lignes de vente concernées (articles de cet auteur)
 * @param formule      barème DA à appliquer
 * @param contexte     contexte de la vente (vendeur, commission, type)
 * @param avanceDue    montant de l'à-valoir déjà reversé à l'auteur (à recouper)
 * @param avanceTotal  montant total de l'à-valoir contractuel
 */
export function calculateRoyalties(
  lignes:      LigneVenteDA[],
  formule:     FormuleDA,
  contexte:    ContexteVente,
  avanceDue:   number = 0,
  avanceTotal: number = 0,
): ResultatRoyalties {
  const regle = evaluateDA(formule, contexte)

  if (!regle || lignes.length === 0) {
    return {
      taux: 0, base: 'TTC',
      montantBrut: 0, avanceRecoupee: 0,
      avanceRestante: Math.max(0, avanceTotal - avanceDue),
      montantNet: 0, lignes: [],
    }
  }

  const { taux, base } = regle
  const facteur = taux / 100

  const lignesCalculees = lignes.map((l) => ({
    articleId: l.articleId,
    montant:   arrondir((base === 'TTC' ? l.totalLigneTTC : l.totalLigneHT) * facteur),
  }))

  const montantBrut   = arrondir(lignesCalculees.reduce((s, l) => s + l.montant, 0))
  const avanceRestante = Math.max(0, avanceTotal - avanceDue)
  const avanceRecoupee = arrondir(Math.min(montantBrut, avanceRestante))
  const montantNet    = arrondir(montantBrut - avanceRecoupee)

  return {
    taux,
    base,
    montantBrut,
    avanceRecoupee,
    avanceRestante: arrondir(avanceRestante - avanceRecoupee),
    montantNet,
    lignes: lignesCalculees,
  }
}

function arrondir(v: number): number {
  return Math.round(v * 100) / 100
}
