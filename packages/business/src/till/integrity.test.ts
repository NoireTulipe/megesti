import { describe, it, expect } from 'vitest'
import { computeGenesisHash, computeVenteHash, verifyChain } from './integrity.js'

const SECRET    = 'secret-de-test'
const TENANT_ID = '11111111-1111-1111-1111-111111111111'

const base: Parameters<typeof computeVenteHash>[1] = {
  id:           '22222222-2222-2222-2222-222222222222',
  numero:       1,
  tenantId:     TENANT_ID,
  sessionId:    '33333333-3333-3333-3333-333333333333',
  dateVente:    '2026-04-26T10:00:00.000Z',
  modePaiement: 'CB',
  totalHT:      100,
  totalTVA:     20,
  totalTTC:     120,
}

describe('computeVenteHash', () => {
  it('produit un hash hex de 64 caractères', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const hash = computeVenteHash(genesis, base, SECRET)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('est déterministe', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    expect(computeVenteHash(genesis, base, SECRET)).toBe(computeVenteHash(genesis, base, SECRET))
  })

  it('change si totalTTC change', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const h1 = computeVenteHash(genesis, base, SECRET)
    const h2 = computeVenteHash(genesis, { ...base, totalTTC: 130 }, SECRET)
    expect(h1).not.toBe(h2)
  })

  it('change si previousHash change', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const h1 = computeVenteHash(genesis, base, SECRET)
    const h2 = computeVenteHash('autre-hash', base, SECRET)
    expect(h1).not.toBe(h2)
  })

  it('change si le secret change', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const h1 = computeVenteHash(genesis, base, SECRET)
    const h2 = computeVenteHash(genesis, base, 'autre-secret')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyChain', () => {
  it('valide une chaîne vide', () => {
    expect(verifyChain([], TENANT_ID, SECRET)).toEqual({ valid: true, checked: 0 })
  })

  it('valide une chaîne correcte de 3 ventes', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const v1 = { ...base, numero: 1 }
    const h1 = computeVenteHash(genesis, v1, SECRET)
    const v2 = { ...base, id: '44444444-4444-4444-4444-444444444444', numero: 2 }
    const h2 = computeVenteHash(h1, v2, SECRET)
    const v3 = { ...base, id: '55555555-5555-5555-5555-555555555555', numero: 3 }
    const h3 = computeVenteHash(h2, v3, SECRET)

    const result = verifyChain([
      { ...v1, hash: h1, previousHash: genesis },
      { ...v2, hash: h2, previousHash: h1 },
      { ...v3, hash: h3, previousHash: h2 },
    ], TENANT_ID, SECRET)

    expect(result).toEqual({ valid: true, checked: 3 })
  })

  it('détecte une falsification du totalTTC', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const v1 = { ...base, numero: 1 }
    const h1 = computeVenteHash(genesis, v1, SECRET)
    const v2 = { ...base, id: '44444444-4444-4444-4444-444444444444', numero: 2 }
    const h2 = computeVenteHash(h1, v2, SECRET)

    const result = verifyChain([
      { ...v1, hash: h1, previousHash: genesis },
      { ...v2, totalTTC: 999, hash: h2, previousHash: h1 }, // falsifié
    ], TENANT_ID, SECRET)

    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(2)
  })

  it('détecte un previousHash incorrect', () => {
    const genesis = computeGenesisHash(TENANT_ID, SECRET)
    const v1 = { ...base, numero: 1 }
    const h1 = computeVenteHash(genesis, v1, SECRET)

    const result = verifyChain([
      { ...v1, hash: h1, previousHash: 'mauvais-genesis' },
    ], TENANT_ID, SECRET)

    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(1)
  })
})
