import { describe, it, expect } from 'vitest'
import { buildReference, extractBookPrefix } from './reference.js'

describe('buildReference', () => {
  it('cas nominal — auteur simple + livre + année + ordre 1', () => {
    const ref = buildReference('François Bonacci', 'Kazuki, L\'éveil de la prêtresse d\'Aether [2]', '2026', 1)
    expect(ref).toBe('FB-KAZU-2026-001')
  })

  it('auteur avec 3 mots → 2 premières initiales', () => {
    const ref = buildReference('Jean Marie Dupont', 'Test', '2026', 1)
    expect(ref).toBe('JM-TEST-2026-001')
  })

  it('auteur avec un seul mot → une initiale', () => {
    const ref = buildReference('Platon', 'La République', '2025', 1)
    // é et espace retirés → "LaRpublique" → "LARP"
    expect(ref).toBe('P-LARP-2025-001')
  })

  it('article nom null → TOUS', () => {
    const ref = buildReference('Marie Curie', null, '2024', 3)
    expect(ref).toBe('MC-TOUS-2024-003')
  })

  it('titre avec caractères spéciaux → épuré', () => {
    const ref = buildReference('Victor Hugo', 'L\'Homme qui rit — Tome 1', '2026', 1)
    expect(ref).toBe('VH-LHOM-2026-001')
  })

  it('titre très court → padEnd avec X', () => {
    const ref = buildReference('Jules Verne', 'V', '2026', 1)
    expect(ref).toBe('JV-VXXX-2026-001')
  })

  it('numéro d\'ordre à 3 chiffres', () => {
    const ref = buildReference('Molière', 'Tartuffe', '2026', 42)
    expect(ref).toBe('M-TART-2026-042')
  })

  it('numéro d\'ordre > 999 — pas de padding supplémentaire', () => {
    const ref = buildReference('Molière', 'Tartuffe', '2026', 1234)
    expect(ref).toBe('M-TART-2026-1234')
  })

  it('auteur avec accent → accent conservé dans l\'initiale', () => {
    // Les accents ne sont PAS retirés des initiales (contrairement au titre)
    const ref = buildReference('Émile Zola', 'Germinal', '2026', 1)
    expect(ref).toBe('ÉZ-GERM-2026-001')
  })

  it('titre avec accents → accents retirés', () => {
    const ref = buildReference('Albert Camus', "L'Étranger", '2026', 1)
    // ' et É retirés → "Ltranger" → "LTRA"
    expect(ref).toBe('AC-LTRA-2026-001')
  })

  it('le format est toujours en majuscules', () => {
    const ref = buildReference('simone de beauvoir', 'le deuxième sexe', '2026', 1)
    expect(ref).toBe('SD-LEDE-2026-001')
  })
})

describe('extractBookPrefix', () => {
  it('extrait les 4 premières lettres alphanumériques', () => {
    expect(extractBookPrefix('Kazuki, L\'éveil')).toBe('KAZU')
  })

  it('ignore espaces et ponctuation', () => {
    expect(extractBookPrefix('A. B. C. D.')).toBe('ABCD')
  })

  it('titre vide → chaîne vide', () => {
    expect(extractBookPrefix('')).toBe('')
  })

  it('titre avec seulement des symboles → chaîne vide', () => {
    expect(extractBookPrefix('!!! --- ...')).toBe('')
  })
})
