import type { FastifyPluginAsync } from 'fastify'

// Payload envoyé par SuperPDP sur le webhook AFNOR
// Le format exact n'est pas encore entièrement documenté — on traite défensivement.
interface AfnorWebhookPayload {
  flowId?:       string
  flowType?:     string
  flowDirection?: string
  trackingId?:   string
  acknowledgement?: { status: string }
  [key: string]: unknown
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Route sans authentification JWT — SuperPDP appelle depuis l'extérieur
  app.post('/afnor', async (request, reply) => {
    const body = request.body as AfnorWebhookPayload

    // TODO: vérifier la signature HMAC une fois que SuperPDP documente le schéma complet
    // const sig = request.headers['x-superpdp-signature']

    const { flowId, flowType, trackingId, acknowledgement } = body

    if (!flowId || !flowType) {
      return reply.status(400).send({ error: 'Payload incomplet' })
    }

    app.log.info({ flowId, flowType, trackingId }, 'Webhook AFNOR reçu')

    try {
      // Facture émise — mise à jour statut sur pre-check failure
      if (flowType === 'CustomerInvoice' && acknowledgement?.status === 'Rejected' && trackingId) {
        await app.db.factureEmission.updateMany({
          where: { numero: trackingId, statut: 'ENVOYEE' },
          data:  { statut: 'REFUSEE' },
        })
      }

      // Lifecycle acheteur → mise à jour statut
      if (flowType === 'CustomerInvoiceLC' && trackingId) {
        const statut = acknowledgement?.status === 'Rejected' ? 'REFUSEE'
          : acknowledgement?.status === 'Accepted' ? 'ACCEPTEE'
          : null
        if (statut) {
          await app.db.factureEmission.updateMany({
            where: { numero: trackingId, statut: 'ENVOYEE' },
            data:  { statut },
          })
        }
      }

      // Facture reçue → créer FactureReception si pas encore présente
      if (flowType === 'SupplierInvoice' && flowId) {
        const exists = await app.db.factureReception.findFirst({
          where: { pdpId: flowId },
        })
        if (!exists) {
          // Sans Organization-Id dans le webhook, on ne peut pas identifier le tenant directement.
          // Le polling AFNOR régulier ramassera cette facture de toute façon.
          app.log.info({ flowId }, 'SupplierInvoice webhook — sera traitée au prochain polling')
        }
      }
    } catch (err: unknown) {
      app.log.error({ err }, 'Erreur traitement webhook AFNOR')
    }

    // Toujours répondre 200 pour éviter les retentatives SuperPDP
    return reply.status(200).send({ received: true })
  })
}
