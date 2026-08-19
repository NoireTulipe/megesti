import { describe, it, expect } from 'vitest'
import { calculerTotauxFacture } from './totaux.js'

describe('calculerTotauxFacture', () => {
  it('renvoie des totaux nuls pour une facture vide', () => {
    expect(calculerTotauxFacture([])).toEqual({ ht: 0, tva: 0, ttc: 0, tvaParTaux: [] })
  })

  it('calcule une ligne simple au taux du livre (5,5 %)', () => {
    const t = calculerTotauxFacture([{ quantite: 1, prixUnitaireHT: 20, tauxTVA: 5.5 }])
    expect(t.ht).toBe(20)
    expect(t.tva).toBe(1.1)
    expect(t.ttc).toBe(21.1)
    expect(t.tvaParTaux).toEqual([[5.5, 1.1]])
  })

  it('multiplie par la quantité', () => {
    const t = calculerTotauxFacture([{ quantite: 3, prixUnitaireHT: 12.5, tauxTVA: 20 }])
    expect(t.ht).toBe(37.5)
    expect(t.tva).toBe(7.5)
    expect(t.ttc).toBe(45)
  })

  it('ventile la TVA par taux, triée par taux croissant', () => {
    const t = calculerTotauxFacture([
      { quantite: 1, prixUnitaireHT: 100, tauxTVA: 20 },
      { quantite: 1, prixUnitaireHT: 100, tauxTVA: 5.5 },
      { quantite: 1, prixUnitaireHT: 100, tauxTVA: 20 },
    ])
    expect(t.tvaParTaux).toEqual([[5.5, 5.5], [20, 40]])
    expect(t.ht).toBe(300)
    expect(t.tva).toBe(45.5)
    expect(t.ttc).toBe(345.5)
  })

  it('exclut les taux dont la TVA est nulle de la ventilation', () => {
    const t = calculerTotauxFacture([
      { quantite: 1, prixUnitaireHT: 50, tauxTVA: 0 },
      { quantite: 1, prixUnitaireHT: 50, tauxTVA: 20 },
    ])
    expect(t.tvaParTaux).toEqual([[20, 10]])
    expect(t.ht).toBe(100)
    expect(t.tva).toBe(10)
    expect(t.ttc).toBe(110)
  })

  it('arrondit par ligne puis somme (méthode fiscale), pas l\'inverse', () => {
    // 3 lignes à 0,105 € de TVA : arrondi par ligne -> 0,11 x 3 = 0,33.
    // Sommer d'abord (0,315) puis arrondir donnerait 0,32 — l'écart d'un
    // centime avec les mentions ligne à ligne de la facture.
    const t = calculerTotauxFacture([
      { quantite: 1, prixUnitaireHT: 1.05, tauxTVA: 10 },
      { quantite: 1, prixUnitaireHT: 1.05, tauxTVA: 10 },
      { quantite: 1, prixUnitaireHT: 1.05, tauxTVA: 10 },
    ])
    expect(t.tva).toBe(0.33)
    expect(t.ht).toBe(3.15)
    expect(t.ttc).toBe(3.48)
  })

  it('reste juste malgré les flottants (0,1 + 0,2)', () => {
    const t = calculerTotauxFacture([
      { quantite: 1, prixUnitaireHT: 0.1, tauxTVA: 0 },
      { quantite: 1, prixUnitaireHT: 0.2, tauxTVA: 0 },
    ])
    expect(t.ht).toBe(0.3)
    expect(t.ttc).toBe(0.3)
  })

  it('gère une remise saisie en quantité négative', () => {
    const t = calculerTotauxFacture([
      { quantite: 2, prixUnitaireHT: 30, tauxTVA: 20 },
      { quantite: -1, prixUnitaireHT: 10, tauxTVA: 20 },
    ])
    expect(t.ht).toBe(50)
    expect(t.tva).toBe(10)
    expect(t.ttc).toBe(60)
  })

  it('additionne plusieurs lignes au même taux dans une seule entrée', () => {
    const t = calculerTotauxFacture([
      { quantite: 2, prixUnitaireHT: 15, tauxTVA: 5.5 },
      { quantite: 1, prixUnitaireHT: 15, tauxTVA: 5.5 },
    ])
    expect(t.tvaParTaux).toHaveLength(1)
    expect(t.tvaParTaux[0]?.[0]).toBe(5.5)
    expect(t.ht).toBe(45)
  })
})
