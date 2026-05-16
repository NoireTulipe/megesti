import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'

// Packs de crédits factures — prix en centimes
const PACKS = [
  { id: 'pack_10',  credits: 10,  label: '10 crédits',  unitAmount: 150  }, // 1,50 €
  { id: 'pack_50',  credits: 50,  label: '50 crédits',  unitAmount: 600  }, // 6,00 €
  { id: 'pack_100', credits: 100, label: '100 crédits', unitAmount: 1000 }, // 10,00 €
] as const

export const stripeRoutes: FastifyPluginAsync = async (app) => {
  const stripeKey = process.env['STRIPE_SECRET_KEY']
  if (!stripeKey) {
    app.log.warn('STRIPE_SECRET_KEY manquant — routes Stripe désactivées')
    return
  }

  const stripe          = new Stripe(stripeKey)
  const webhookSecret   = process.env['STRIPE_WEBHOOK_SECRET'] ?? ''
  const appUrl          = process.env['APP_URL'] ?? 'http://localhost:5173'

  // ── Liste des packs disponibles ─────────────────────────────────────────────
  app.get('/packs', { preHandler: app.authenticate }, async () => {
    return PACKS.map(p => ({ ...p, prixEuros: p.unitAmount / 100 }))
  })

  // ── Création d'une session Stripe Checkout ──────────────────────────────────
  app.post('/checkout', { preHandler: app.authenticate }, async (request, reply) => {
    const { tenantId } = request.tenant
    const { packId } = request.body as { packId: string }

    const pack = PACKS.find(p => p.id === packId)
    if (!pack) return reply.badRequest('Pack inconnu')

    const tenant = await app.db.tenant.findUnique({
      where:  { id: tenantId },
      select: { stripeCustomerId: true, name: true },
    })

    // Créer ou réutiliser le customer Stripe du tenant
    let customerId = tenant?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ name: tenant?.name ?? tenantId })
      customerId = customer.id
      await app.db.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'payment',
      line_items:  [{
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  pack.unitAmount,
          product_data: { name: `Facturier MeGesti — ${pack.label}` },
        },
      }],
      success_url: `${appUrl}/facturation?rechargement=ok`,
      cancel_url:  `${appUrl}/facturation`,
      metadata:    { tenantId, packId, credits: String(pack.credits) },
    })

    return { url: session.url }
  })

  // ── Webhook Stripe ──────────────────────────────────────────────────────────
  // Doit être déclaré AVANT tout plugin qui parse le body en JSON
  app.post('/webhook', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        (request as any).rawBody ?? Buffer.from(''),
        sig,
        webhookSecret,
      )
    } catch (err: any) {
      app.log.warn(`Stripe webhook signature invalide: ${err.message}`)
      return reply.status(400).send({ error: 'signature invalide' })
    }

    if (event.type === 'checkout.session.completed') {
      const session  = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenantId
      const credits  = Number(session.metadata?.credits ?? 0)

      if (tenantId && credits > 0) {
        await app.db.tenant.update({
          where: { id: tenantId },
          data:  { facturesCredit: { increment: credits } },
        })
        app.log.info(`[Stripe] +${credits} crédits factures → tenant ${tenantId}`)
      }
    }

    return { received: true }
  })
}
