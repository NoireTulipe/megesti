/**
 * Calcule la commission d'un point de vente sur un reversement.
 *
 * Règles :
 * - Si un montant ajusté est présent, la commission = brut - ajusté
 *   (le PDV a versé moins que prévu, la différence est sa commission implicite)
 * - Sinon : commission fixe + pourcentage du brut
 *
 * @returns montant de la commission (toujours >= 0)
 */
export function calculerCommissionReversement(params: {
  montantBrut:    number
  montantAjuste?: number | null
  commissionFixe?:    number | null
  commissionPourcent?: number | null
}): number {
  const brut = params.montantBrut

  // Si ajustement présent, la commission implicite = brut - ajusté
  if (params.montantAjuste !== null && params.montantAjuste !== undefined) {
    return Math.max(0, brut - params.montantAjuste)
  }

  const fixe = params.commissionFixe ?? 0
  const pct  = params.commissionPourcent ?? 0
  return fixe + brut * pct / 100
}

/**
 * Calcule le montant net que le PDV doit reverser après commission.
 */
export function calculerNetReversement(params: {
  montantBrut:    number
  montantAjuste?: number | null
  commissionFixe?:    number | null
  commissionPourcent?: number | null
}): number {
  const commission = calculerCommissionReversement(params)
  return Math.max(0, params.montantBrut - commission)
}
