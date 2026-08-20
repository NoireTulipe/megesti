import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { timingSafeEqual } from 'node:crypto'

// Payload envoyé par SuperPDP sur le webhook AFNOR.
// Le format exact n'est pas entièrement documenté — on traite défensivement.
interface AfnorWebhookPayload {
  flowId?:       string
  flowType?:     string
  flowDirection?: string
  trackingId?:   string
  acknowledgement?: { status: string }
  [key: string]: unknown
}

/** Comparaison à durée constante : pas de fuite du secret par le temps de réponse. */
function secretValide(fourni: string | undefined, attendu: string): boolean {
  if (!fourni) return false
  const a = Buffer.from(fourni)
  const b = Buffer.from(attendu)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  const secret = process.env['WEBHOOK_SECRET'] ?? ''

  if (secret.length < 24) {
    app.log.warn(
      '[webhooks] WEBHOOK_SECRET absent ou trop court (< 24 caracteres) : le webhook AFNOR ' +
      'REFUSERA tous les appels. Les statuts de factures seront mis a jour par le polling, ' +
      'avec un simple retard. Definissez WEBHOOK_SECRET et reportez-le dans l\'URL configuree ' +
      'chez SuperPDP pour retablir le temps reel.',
    )
  }

  /**
   * Webhook AFNOR — appele depuis l'exterieur, donc sans JWT.
   *
   * Authentification par secret partage, accepte de deux facons :
   *  - en-tete `x-webhook-secret` ;
   *  - segment d'URL `/webhooks/afnor/<secret>`, pour les fournisseurs qui ne
   *    permettent pas d'ajouter un en-tete personnalise.
   *
   * Sans secret configure, on refuse : le polling AFNOR fait le meme travail de
   * facon authentifiee et scopee par tenant, on ne perd que la reactivite.
   */
  const traiter = async (request: FastifyRequest, secretFourni: string | undefined) => {
    if (secret.length < 24 || !secretValide(secretFourni, secret)) {
      request.log.warn({ ip: request.ip }, '[webhooks] appel AFNOR refuse : secret invalide')
      return { code: 401 as const, corps: { error: 'Non autorise' } }
    }

    const body = request.body as AfnorWebhookPayload
    const { flowId, flowType, trackingId, acknowledgement } = body

    if (!flowId || !flowType) {
      return { code: 400 as const, corps: { error: 'Payload incomplet' } }
    }

    request.log.info({ flowId, flowType, trackingId }, 'Webhook AFNOR recu')

    try {
      // `flowId` est l'identifiant attribue par la plateforme : il est unique
      // au niveau mondial, contrairement au numero de facture qui n'est unique
      // que par tenant (@@unique([tenantId, numero])). Apparier sur le numero
      // aurait modifie la facture de MEME numero chez TOUS les tenants.
      const statut =
        flowType === 'CustomerInvoice' && acknowledgement?.status === 'Rejected' ? 'REFUSEE' :
        flowType === 'CustomerInvoiceLC' && acknowledgement?.status === 'Rejected' ? 'REFUSEE' :
        flowType === 'CustomerInvoiceLC' && acknowledgement?.status === 'Accepted' ? 'ACCEPTEE' :
        null

      if (statut) {
        const maj = await app.db.factureEmission.updateMany({
          where: { pdpId: flowId, statut: 'ENVOYEE' },
          data:  { statut },
        })
        if (maj.count === 0) {
          // Aucune correspondance : facture inconnue, deja traitee, ou emise via
          // un autre canal. Le polling tranchera.
          request.log.info({ flowId }, '[webhooks] aucune facture ENVOYEE pour ce flowId')
        }
      }

      // Facture recue : le webhook ne porte pas d'Organization-Id, on ne peut donc
      // pas rattacher la facture a un tenant. Le polling AFNOR la ramassera.
      if (flowType === 'SupplierInvoice') {
        request.log.info({ flowId }, '[webhooks] SupplierInvoice — traitee au prochain polling')
      }
    } catch (err: unknown) {
      request.log.error({ err }, '[webhooks] erreur de traitement AFNOR')
    }

    // 200 systematique une fois authentifie : evite les retentatives SuperPDP.
    return { code: 200 as const, corps: { received: true } }
  }

  app.post('/afnor', async (request, reply) => {
    const r = await traiter(request, request.headers['x-webhook-secret'] as string | undefined)
    return reply.status(r.code).send(r.corps)
  })

  app.post('/afnor/:secret', async (request, reply) => {
    const { secret: fourni } = request.params as { secret: string }
    const r = await traiter(request, fourni)
    return reply.status(r.code).send(r.corps)
  })
}
