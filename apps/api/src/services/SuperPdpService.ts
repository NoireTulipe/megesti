import type { InvoiceTransmissionService, EmissionResult, FactureRecueBrute } from '@megesti/shared'

const BASE_URL = 'https://api.superpdp.tech'

interface TokenCache {
  token:  string
  expiry: number  // timestamp ms
}

export class SuperPdpService implements InvoiceTransmissionService {
  private cache: TokenCache | null = null

  constructor(
    private readonly clientId:     string,
    private readonly clientSecret:  string,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiry) return this.cache.token

    const res = await fetch(`${BASE_URL}/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SuperPDP auth error ${res.status}: ${text}`)
    }

    const data = await res.json() as { access_token: string; expires_in?: number }
    // Expire 5 min avant la durée réelle pour éviter les tokens périmés en vol
    const ttl = (data.expires_in ?? 3600) - 300
    this.cache = { token: data.access_token, expiry: Date.now() + ttl * 1000 }
    return this.cache.token
  }

  // ── Émission ──────────────────────────────────────────────────────────────

  async emettre(xmlContent: string): Promise<EmissionResult> {
    const token = await this.getToken()
    const res = await fetch(`${BASE_URL}/v1.beta/invoices`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    xmlContent,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SuperPDP émission error ${res.status}: ${text}`)
    }

    const data = await res.json() as { id: string; status?: string }
    return { pdpId: data.id, statut: data.status ?? 'ENVOYEE' }
  }

  // ── Réception (polling) ───────────────────────────────────────────────────

  async listerRecu(sinceId?: string): Promise<FactureRecueBrute[]> {
    const token = await this.getToken()
    const params = new URLSearchParams({ order: 'desc' })
    if (sinceId) params.set('starting_after_id', sinceId)

    const res = await fetch(`${BASE_URL}/v1.beta/invoices?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SuperPDP listing error ${res.status}: ${text}`)
    }

    return res.json() as Promise<FactureRecueBrute[]>
  }

  // ── Téléchargement ────────────────────────────────────────────────────────

  async telecharger(pdpId: string): Promise<string> {
    const token = await this.getToken()
    const res = await fetch(`${BASE_URL}/v1.beta/invoices/${pdpId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SuperPDP download error ${res.status}: ${text}`)
    }

    return res.text()
  }

  // ── Statut (acceptation / refus) ──────────────────────────────────────────

  async envoyerStatut(pdpId: string, codeStatut: string): Promise<void> {
    const token = await this.getToken()
    const res = await fetch(`${BASE_URL}/v1.beta/invoice_events`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_id:  pdpId,
        status_code: codeStatut,  // ex: "fr:212" (acceptée), "fr:220" (refusée)
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SuperPDP statut error ${res.status}: ${text}`)
    }
  }
}

// ── Factory : instance globale (un seul compte superpdp pour tout MeGesti) ────

let _instance: SuperPdpService | null = null

export function getPdpService(): SuperPdpService {
  if (!_instance) {
    const id     = process.env['SUPERPDP_CLIENT_ID']
    const secret = process.env['SUPERPDP_CLIENT_SECRET']
    if (!id || !secret) throw new Error('SUPERPDP_CLIENT_ID / SUPERPDP_CLIENT_SECRET manquants dans .env')
    _instance = new SuperPdpService(id, secret)
  }
  return _instance
}
