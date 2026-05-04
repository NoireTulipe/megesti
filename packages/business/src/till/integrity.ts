import { createHmac } from 'node:crypto'

export interface VenteHashData {
  id: string
  numero: number
  tenantId: string
  sessionId: string | null
  dateVente: Date | string
  modePaiement: string
  totalHT: number
  totalTVA: number
  totalTTC: number
}

export interface VenteForVerification extends VenteHashData {
  hash: string
  previousHash: string
}

export interface IntegrityResult {
  valid: boolean
  checked: number
  brokenAt?: number
  reason?: string
}

function toISO(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : date
}

export function computeGenesisHash(tenantId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`GENESIS:${tenantId}`)
    .digest('hex')
}

export function computeVenteHash(
  previousHash: string,
  vente: VenteHashData,
  secret: string,
): string {
  const data = [
    previousHash,
    vente.id,
    String(vente.numero),
    vente.tenantId,
    vente.sessionId ?? '',
    toISO(vente.dateVente),
    vente.modePaiement,
    vente.totalHT.toFixed(2),
    vente.totalTVA.toFixed(2),
    vente.totalTTC.toFixed(2),
  ].join('|')
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function verifyChain(
  ventes: VenteForVerification[],
  tenantId: string,
  secret: string,
): IntegrityResult {
  if (ventes.length === 0) return { valid: true, checked: 0 }

  let expectedPrev = computeGenesisHash(tenantId, secret)

  for (const v of ventes) {
    if (v.previousHash !== expectedPrev) {
      return { valid: false, checked: ventes.indexOf(v), brokenAt: v.numero, reason: 'previousHash incorrect' }
    }
    const expected = computeVenteHash(v.previousHash, v, secret)
    if (v.hash !== expected) {
      return { valid: false, checked: ventes.indexOf(v), brokenAt: v.numero, reason: 'hash incorrect' }
    }
    expectedPrev = v.hash
  }

  return { valid: true, checked: ventes.length }
}
