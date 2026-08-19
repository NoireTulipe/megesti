/**
 * Calcul des totaux d'une facture émise.
 *
 * Enjeu : facturation électronique 2026-2027 et loi anti-fraude TVA. Ce calcul
 * doit être testé et partagé, pas dupliqué dans un composant d'interface.
 *
 * Règle d'arrondi : on arrondit **par ligne** (au centime), puis on somme.
 * C'est la méthode attendue par l'administration fiscale française — sommer
 * d'abord puis arrondir donnerait des écarts d'un centime avec les mentions
 * ligne à ligne imprimées sur la facture.
 */

/** Arrondi au centime. */
function auCentime(v: number): number {
  return Math.round(v * 100) / 100
}

export interface LigneFacture {
  quantite:       number
  prixUnitaireHT: number
  /** Taux de TVA en pourcentage (5.5 pour 5,5 %). */
  tauxTVA:        number
}

export interface TotauxFacture {
  ht:  number
  tva: number
  ttc: number
  /** Ventilation par taux, triée par taux croissant. Taux à TVA nulle exclus. */
  tvaParTaux: [taux: number, montant: number][]
}

export function calculerTotauxFacture(lignes: readonly LigneFacture[]): TotauxFacture {
  let ht = 0
  let tva = 0
  const parTaux = new Map<number, number>()

  for (const l of lignes) {
    const ligneHT  = auCentime(l.prixUnitaireHT * l.quantite)
    const ligneTVA = auCentime((ligneHT * l.tauxTVA) / 100)

    ht  += ligneHT
    tva += ligneTVA
    parTaux.set(l.tauxTVA, auCentime((parTaux.get(l.tauxTVA) ?? 0) + ligneTVA))
  }

  return {
    ht:  auCentime(ht),
    tva: auCentime(tva),
    ttc: auCentime(ht + tva),
    tvaParTaux: Array.from(parTaux.entries())
      .filter(([, montant]) => montant > 0)
      .sort(([a], [b]) => a - b),
  }
}
