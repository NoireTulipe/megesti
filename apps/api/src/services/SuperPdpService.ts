import type { InvoiceTransmissionService, EmissionResult, FactureRecueBrute, EvenementFactureBrut, PagePdp } from '@megesti/shared'

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
    console.log(`[SuperPDP] emettre → POST ${BASE_URL}/v1.beta/invoices (${xmlContent.length} chars)`)
    const res = await fetch(`${BASE_URL}/v1.beta/invoices`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/xml' },
      body:    xmlContent,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[SuperPDP] emettre ERROR ${res.status}:`, text)
      throw new Error(`SuperPDP émission error ${res.status}: ${text}`)
    }

    const data = await res.json() as { id: string; status?: string }
    console.log(`[SuperPDP] emettre OK id=${data.id}`)
    return { pdpId: data.id, statut: data.status ?? 'ENVOYEE' }
  }

  // ── Réception (polling paginé) ────────────────────────────────────────────
  // Retourne TOUTES les factures reçues depuis sinceId en bouclant sur has_after.

  async listerRecu(sinceId?: string): Promise<FactureRecueBrute[]> {
    const token  = await this.getToken()
    const result: FactureRecueBrute[] = []
    let   cursor = sinceId

    do {
      const params = new URLSearchParams()
      if (cursor) params.set('starting_after_id', cursor)

      const res = await fetch(`${BASE_URL}/v1.beta/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`SuperPDP listing error ${res.status}: ${text}`)
      }

      const page = await res.json() as PagePdp<FactureRecueBrute>
      result.push(...page.data)

      // Avance le curseur vers le dernier ID reçu pour la prochaine page
      const last = page.data.at(-1)
      cursor = last ? String(last.id) : cursor

      if (!page.has_after) break
    } while (true)

    return result
  }

  // ── Événements (polling paginé) ────────────────────────────────────────────
  // Retourne TOUS les invoice_events depuis sinceId (statuts des factures émises).

  async listerEvenements(sinceId?: string): Promise<EvenementFactureBrut[]> {
    const token  = await this.getToken()
    const result: EvenementFactureBrut[] = []
    let   cursor = sinceId

    do {
      const params = new URLSearchParams()
      if (cursor) params.set('starting_after_id', cursor)

      const res = await fetch(`${BASE_URL}/v1.beta/invoice_events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`SuperPDP events error ${res.status}: ${text}`)
      }

      const page = await res.json() as PagePdp<EvenementFactureBrut>
      result.push(...page.data)

      const last = page.data.at(-1)
      cursor = last ? String(last.id) : cursor

      if (!page.has_after) break
    } while (true)

    return result
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  // Tente d'abord le XML (contient les noms de produits), sinon fallback JSON.

  async telecharger(pdpId: string): Promise<string> {
    const token = await this.getToken()

    // Essai 1 : XML UBL (plus riche — contient les libellés de lignes)
    for (const fmt of ['ubl', 'cii'] as const) {
      try {
        const r = await fetch(`${BASE_URL}/v1.beta/invoices/${pdpId}?format=${fmt}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.ok) {
          const text = await r.text()
          if (text.trimStart().startsWith('<')) return text  // c'est du XML
        }
      } catch { /* essai suivant */ }
    }

    // Essai 2 : JSON (fallback — pas de noms de produits dans les lignes)
    const res = await fetch(`${BASE_URL}/v1.beta/invoices/${pdpId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`SuperPDP download error ${res.status}: ${await res.text()}`)
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
