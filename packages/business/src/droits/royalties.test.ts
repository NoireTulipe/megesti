import { describe, it, expect } from 'vitest'
import { evaluateDA, calculateRoyalties } from './royalties.js'
import type { FormuleDA, LigneVenteDA, ContexteVente } from './types.js'

// ── Formule de référence (cas réels décrits par l'utilisateur) ────────────────

const FORMULE_STANDARD: FormuleDA = {
  lignes: [
    { conditions: { vendeur: 'AUTEUR' },                          taux: 50, base: 'TTC' },
    { conditions: { vendeur: 'ME', avecCommission: false },       taux: 40, base: 'TTC' },
    { conditions: { avecCommission: true },                       taux: 30, base: 'TTC' },
    { conditions: {},                                             taux: 35, base: 'TTC' }, // fallback
  ],
}

const LIGNE: LigneVenteDA = {
  articleId:     'art-1',
  quantite:      1,
  totalLigneHT:  18.87,
  totalLigneTTC: 20.00,
}

// ── evaluateDA ─────────────────────────────────────────────────────────────────

describe('evaluateDA', () => {
  it('auteur qui vend → 50%', () => {
    const r = evaluateDA(FORMULE_STANDARD, { vendeur: 'AUTEUR', avecCommission: false })
    expect(r?.taux).toBe(50)
  })

  it('ME sans commission → 40%', () => {
    const r = evaluateDA(FORMULE_STANDARD, { vendeur: 'ME', avecCommission: false })
    expect(r?.taux).toBe(40)
  })

  it('ME avec commission → 30% (3e règle, pas la 2e)', () => {
    const r = evaluateDA(FORMULE_STANDARD, { vendeur: 'ME', avecCommission: true })
    expect(r?.taux).toBe(30)
  })

  it('auteur avec commission → 50% (1ère règle prime)', () => {
    // L'auteur vend lui-même même si le lieu a une commission → 50%
    const r = evaluateDA(FORMULE_STANDARD, { vendeur: 'AUTEUR', avecCommission: true })
    expect(r?.taux).toBe(50)
  })

  it('fallback si aucune règle spécifique', () => {
    const formule: FormuleDA = { lignes: [{ conditions: {}, taux: 35, base: 'TTC' }] }
    const r = evaluateDA(formule, { vendeur: 'ME', avecCommission: false })
    expect(r?.taux).toBe(35)
  })

  it('retourne null si formule vide', () => {
    expect(evaluateDA({ lignes: [] }, { vendeur: 'ME', avecCommission: false })).toBeNull()
  })

  it('première règle correspondante gagne (ordre important)', () => {
    const formule: FormuleDA = {
      lignes: [
        { conditions: { avecCommission: true }, taux: 30, base: 'TTC' },
        { conditions: { vendeur: 'ME' },        taux: 40, base: 'TTC' },
      ],
    }
    // ME avec commission → 1ère règle gagne (30%), pas la 2e (40%)
    const r = evaluateDA(formule, { vendeur: 'ME', avecCommission: true })
    expect(r?.taux).toBe(30)
  })
})

// ── calculateRoyalties ─────────────────────────────────────────────────────────

describe('calculateRoyalties', () => {
  const CTX_AUTEUR: ContexteVente = { vendeur: 'AUTEUR', avecCommission: false }
  const CTX_ME:     ContexteVente = { vendeur: 'ME',     avecCommission: false }
  const CTX_COMM:   ContexteVente = { vendeur: 'ME',     avecCommission: true  }

  it('calcul de base — auteur vend 1 livre à 20€ TTC → 10€', () => {
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_AUTEUR)
    expect(r.montantBrut).toBe(10.00)
    expect(r.montantNet).toBe(10.00)
    expect(r.taux).toBe(50)
    expect(r.avanceRecoupee).toBe(0)
  })

  it('ME sans commission — 1 livre 20€ TTC → 8€', () => {
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_ME)
    expect(r.montantBrut).toBe(8.00)
    expect(r.montantNet).toBe(8.00)
  })

  it('avec commission — 30% sur 20€ → 6€', () => {
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_COMM)
    expect(r.montantBrut).toBe(6.00)
  })

  it('plusieurs lignes — somme correcte', () => {
    const lignes: LigneVenteDA[] = [
      { articleId: 'art-1', quantite: 2, totalLigneHT: 37.74, totalLigneTTC: 40.00 },
      { articleId: 'art-2', quantite: 1, totalLigneHT:  9.43, totalLigneTTC: 10.00 },
    ]
    const r = calculateRoyalties(lignes, FORMULE_STANDARD, CTX_AUTEUR)
    expect(r.montantBrut).toBe(25.00) // 50% de 50€
    expect(r.lignes).toHaveLength(2)
    expect(r.lignes[0]?.montant).toBe(20.00)
    expect(r.lignes[1]?.montant).toBe(5.00)
  })

  it('à-valoir non encore recoupé — déduit des royalties', () => {
    // avanceTotal=100€, avanceDue=0€ (rien versé), montant brut=10€ → recoupé 10€
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_AUTEUR, 0, 100)
    expect(r.montantBrut).toBe(10.00)
    expect(r.avanceRecoupee).toBe(10.00)
    expect(r.montantNet).toBe(0)
    expect(r.avanceRestante).toBe(90.00)
  })

  it('à-valoir partiellement recoupé', () => {
    // avanceTotal=100€, avanceDue=95€ → reste 5€ à recouper, royalties=10€
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_AUTEUR, 95, 100)
    expect(r.avanceRecoupee).toBe(5.00)
    expect(r.montantNet).toBe(5.00)
    expect(r.avanceRestante).toBe(0)
  })

  it('à-valoir totalement recoupé — sans impact', () => {
    // avanceDue >= avanceTotal → plus rien à recouper
    const r = calculateRoyalties([LIGNE], FORMULE_STANDARD, CTX_AUTEUR, 100, 100)
    expect(r.avanceRecoupee).toBe(0)
    expect(r.montantNet).toBe(10.00)
    expect(r.avanceRestante).toBe(0)
  })

  it('aucune ligne de vente → tout à zéro', () => {
    const r = calculateRoyalties([], FORMULE_STANDARD, CTX_AUTEUR)
    expect(r.montantBrut).toBe(0)
    expect(r.montantNet).toBe(0)
  })

  it('aucune règle correspondante → tout à zéro', () => {
    const formule: FormuleDA = {
      lignes: [{ conditions: { vendeur: 'AUTEUR' }, taux: 50, base: 'TTC' }],
    }
    const r = calculateRoyalties([LIGNE], formule, CTX_ME)
    expect(r.montantBrut).toBe(0)
    expect(r.montantNet).toBe(0)
  })

  it('base HT — calcul sur HT et non TTC', () => {
    const formule: FormuleDA = {
      lignes: [{ conditions: {}, taux: 50, base: 'HT' }],
    }
    const r = calculateRoyalties([LIGNE], formule, CTX_AUTEUR)
    expect(r.montantBrut).toBe(arrondir(18.87 * 0.5))
    expect(r.base).toBe('HT')
  })

  it('arrondi monétaire correct — pas de dérive flottante', () => {
    const lignes: LigneVenteDA[] = [
      { articleId: 'a', quantite: 3, totalLigneHT: 0, totalLigneTTC: 33.33 },
    ]
    const formule: FormuleDA = { lignes: [{ conditions: {}, taux: 33, base: 'TTC' }] }
    const r = calculateRoyalties(lignes, formule, CTX_AUTEUR)
    // 33.33 * 0.33 = 10.9989 → Math.round(1099.89) / 100 = 11.00
    // vérifie que le résultat est un nombre propre (pas 10.998900000001)
    expect(r.montantBrut).toBe(11)
    expect(Number.isFinite(r.montantBrut)).toBe(true)
  })
})

function arrondir(v: number): number {
  return Math.round(v * 100) / 100
}
