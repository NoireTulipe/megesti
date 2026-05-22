import { createHash } from 'crypto'

const BASE  = 'https://api.superpdp.tech/afnor-flow'
const AUTH  = 'https://api.superpdp.tech/oauth2/token'

interface TokenCache { token: string; expiry: number }

// ── Types AFNOR ────────────────────────────────────────────────────────────────

export interface AfnorAck {
  status:  string   // Pending | Accepted | Rejected
  details: Array<{ level: string; reasonCode: string; reasonMessage: string; item: string }>
}

export interface AfnorFlow {
  flowId:        string
  flowType:      string
  flowDirection: 'In' | 'Out'
  flowSyntax:    string
  name:          string
  trackingId?:   string
  submittedAt:   string
  updatedAt:     string
  sha256?:       string
  processingRule?: string
  acknowledgement: AfnorAck
}

export interface AfnorEmissionResult {
  flowId:      string
  submittedAt: string
  sha256:      string
  trackingId:  string
}

// ── Service ────────────────────────────────────────────────────────────────────

export class AfnorFlowService {
  private cache: TokenCache | null = null

  constructor(
    private readonly clientId:     string,
    private readonly clientSecret: string,
  ) {}

  // ── Auth (même endpoint que SuperPDP propriétaire) ─────────────────────────

  private async getToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiry) return this.cache.token
    const res = await fetch(AUTH, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    })
    if (!res.ok) throw new Error(`AFNOR auth error ${res.status}: ${await res.text()}`)
    const data = await res.json() as { access_token: string; expires_in?: number }
    const ttl  = (data.expires_in ?? 3600) - 300
    this.cache = { token: data.access_token, expiry: Date.now() + ttl * 1000 }
    return this.cache.token
  }

  private authHeaders(token: string, organizationId: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, 'Organization-Id': organizationId }
  }

  // ── Émission (POST /v1/flows, multipart) ───────────────────────────────────

  async emettre(
    xmlContent: string,
    numero:     string,
    siren:      string,
  ): Promise<AfnorEmissionResult> {
    const token  = await this.getToken()
    const sha256 = createHash('sha256').update(xmlContent, 'utf8').digest('hex')
    const name   = `facture-${numero}.xml`

    const form = new FormData()
    form.append('file',     new Blob([xmlContent], { type: 'application/xml' }), name)
    form.append('flowInfo', new Blob([JSON.stringify({
      flowSyntax: 'UBL',
      name,
      trackingId: numero.substring(0, 36),
      sha256,
    })], { type: 'application/json' }), 'flowInfo.json')

    console.log(`[AfnorFlow] emettre → POST ${BASE}/v1/flows Organization-Id=${siren} trackingId=${numero}`)
    const res = await fetch(`${BASE}/v1/flows`, {
      method:  'POST',
      headers: this.authHeaders(token, siren),
      body:    form,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[AfnorFlow] emettre ERROR ${res.status}:`, text)
      throw new Error(`AFNOR émission error ${res.status}: ${text}`)
    }

    const result = await res.json() as AfnorEmissionResult
    console.log(`[AfnorFlow] emettre OK flowId=${result.flowId}`)
    return result
  }

  // ── Recherche de flows (pagination par updatedAfter) ──────────────────────

  async rechercherFlows(
    siren:        string,
    flowTypes:    string[],
    directions:   ('In' | 'Out')[],
    updatedAfter?: Date,
  ): Promise<AfnorFlow[]> {
    const token  = await this.getToken()
    const result: AfnorFlow[] = []
    let   cursor = updatedAfter

    do {
      const res = await fetch(`${BASE}/v1/flows/search`, {
        method:  'POST',
        headers: { ...this.authHeaders(token, siren), 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          limit: 100,
          where: {
            flowType:      flowTypes,
            flowDirection: directions,
            processingRule: ['B2B'],
            ...(cursor ? { updatedAfter: cursor.toISOString() } : {}),
          },
        }),
      })

      if (!res.ok) throw new Error(`AFNOR search error ${res.status}: ${await res.text()}`)

      const page = await res.json() as { results?: AfnorFlow[] }
      const batch = page.results ?? []
      result.push(...batch)

      if (batch.length < 100) break

      // Avance le curseur sur le updatedAt du dernier résultat
      const last = batch.at(-1)
      if (last) cursor = new Date(last.updatedAt)
      else break
    } while (true)

    return result
  }

  // ── Téléchargement du XML original ────────────────────────────────────────

  async telecharger(flowId: string, siren: string): Promise<string> {
    const token = await this.getToken()
    const res = await fetch(`${BASE}/v1/flows/${encodeURIComponent(flowId)}?docType=Original`, {
      headers: this.authHeaders(token, siren),
    })
    if (!res.ok) throw new Error(`AFNOR download error ${res.status}: ${await res.text()}`)
    return res.text()
  }

  // ── Abonnement webhook ─────────────────────────────────────────────────────

  async abonnerWebhook(callbackUrl: string, siren: string): Promise<string> {
    const token = await this.getToken()
    const res = await fetch(`${BASE}/v1/webhooks`, {
      method:  'POST',
      headers: { ...this.authHeaders(token, siren), 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url:            callbackUrl,
        flowTypes:      ['CustomerInvoice', 'SupplierInvoice', 'CustomerInvoiceLC', 'SupplierInvoiceLC'],
        processingRules: ['B2B'],
      }),
    })
    if (!res.ok) throw new Error(`AFNOR webhook error ${res.status}: ${await res.text()}`)
    const data = await res.json() as { webhookId?: string; id?: string }
    return data.webhookId ?? data.id ?? ''
  }
}

// ── Factory ────────────────────────────────────────────────────────────────────

let _instance: AfnorFlowService | null = null

export function getAfnorService(): AfnorFlowService {
  if (!_instance) {
    const id     = process.env['SUPERPDP_CLIENT_ID']
    const secret = process.env['SUPERPDP_CLIENT_SECRET']
    if (!id || !secret) throw new Error('SUPERPDP_CLIENT_ID / SUPERPDP_CLIENT_SECRET manquants dans .env')
    _instance = new AfnorFlowService(id, secret)
  }
  return _instance
}

// PDP_MODE=afnor → utilise l'API AFNOR ; sinon → API SuperPDP propriétaire
export function isAfnorEnabled(): boolean {
  return process.env['PDP_MODE'] === 'afnor'
}

// Identifiant Peppol : SIREN (9 chiffres) ou SIREN_routage conservé intact
export function siretToSiren(siret: string): string {
  const clean = siret.trim()
  if (clean.includes('_')) return clean
  return clean.replace(/\D/g, '').substring(0, 9)
}
