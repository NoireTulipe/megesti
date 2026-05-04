import { describe, it, expect } from 'vitest'
import { calculerCommissionReversement, calculerNetReversement } from './commission.js'

describe('calculerCommissionReversement', () => {
  it('commission fixe seule', () => {
    const c = calculerCommissionReversement({
      montantBrut: 1000, commissionFixe: 50,
    })
    expect(c).toBe(50)
  })

  it('commission en pourcentage seule', () => {
    const c = calculerCommissionReversement({
      montantBrut: 1000, commissionPourcent: 15,
    })
    expect(c).toBe(150)
  })

  it('commission fixe + pourcentage cumulés', () => {
    const c = calculerCommissionReversement({
      montantBrut: 1000, commissionFixe: 50, commissionPourcent: 10,
    })
    expect(c).toBe(150) // 50 + 100
  })

  it('aucune commission → 0', () => {
    const c = calculerCommissionReversement({ montantBrut: 500 })
    expect(c).toBe(0)
  })

  it('brut à zéro → 0', () => {
    const c = calculerCommissionReversement({
      montantBrut: 0, commissionPourcent: 10, commissionFixe: 5,
    })
    expect(c).toBe(5) // fixe s'applique même sans vente
  })

  it('ajustement présent → commission implicite = brut - ajusté', () => {
    // Le PDV devait 1000€, n'a versé que 800€ → commission implicite = 200€
    const c = calculerCommissionReversement({
      montantBrut: 1000, montantAjuste: 800,
      commissionPourcent: 15, commissionFixe: 50, // ignorés car ajustement présent
    })
    expect(c).toBe(200)
  })

  it('ajustement > brut → commission ramenée à 0 (ne peut pas être négative)', () => {
    const c = calculerCommissionReversement({
      montantBrut: 500, montantAjuste: 600,
    })
    expect(c).toBe(0)
  })

  it('ajustement = brut → 0', () => {
    const c = calculerCommissionReversement({
      montantBrut: 500, montantAjuste: 500,
    })
    expect(c).toBe(0)
  })

  it('ajustement à 0 → commission = brut total', () => {
    // Le PDV n'a rien versé → tout le brut est considéré comme commission implicite
    const c = calculerCommissionReversement({
      montantBrut: 1000, montantAjuste: 0,
    })
    expect(c).toBe(1000)
  })

  it('pourcentage non entier — 17.5% sur 250€', () => {
    const c = calculerCommissionReversement({
      montantBrut: 250, commissionPourcent: 17.5,
    })
    expect(c).toBe(43.75)
  })

  it('montants avec décimales — précision centimes', () => {
    const c = calculerCommissionReversement({
      montantBrut: 99.99, commissionPourcent: 5.5,
    })
    // 99.99 * 5.5 / 100 = 5.49945
    expect(c).toBeCloseTo(5.50, 2)
  })
})

describe('calculerNetReversement', () => {
  it('net = brut - commission', () => {
    const net = calculerNetReversement({
      montantBrut: 1000, commissionPourcent: 20,
    })
    expect(net).toBe(800)
  })

  it('sans commission → net = brut', () => {
    const net = calculerNetReversement({ montantBrut: 500 })
    expect(net).toBe(500)
  })

  it('commission >= brut → net = 0', () => {
    const net = calculerNetReversement({
      montantBrut: 100, commissionFixe: 120,
    })
    expect(net).toBe(0)
  })

  it('avec ajustement → net = ajusté', () => {
    const net = calculerNetReversement({
      montantBrut: 1000, montantAjuste: 750,
    })
    expect(net).toBe(750)
  })
})
