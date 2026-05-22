import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getPlanFeatures } from '@megesti/shared'
import { getPdpService } from '../services/SuperPdpService.js'
import { getAfnorService, isAfnorEnabled, siretToSiren } from '../services/AfnorFlowService.js'
import { generateUbl } from '../services/UblGenerator.js'

const EmettreSchema = z.object({
  id:                  z.string().uuid(),
  numero:              z.string().min(1),
  dateEmission:        z.string().datetime(),
  dateEcheance:        z.string().datetime().optional().nullable(),
  destinataireSiret:   z.string().optional().nullable(),
  destinataireNom:     z.string().optional().nullable(),
  destinataireAdresse: z.string().optional().nullable(),
  lignes: z.array(z.object({
    description:     z.string().min(1),
    quantite:        z.number().positive(),
    prixUnitaireHT:  z.number().nonnegative(),
    tauxTVA:         z.number().nonnegative(),
  })).min(1),
})

export const facturationRoutes: FastifyPluginAsync = async (app) => {
  const auth       = { preHandler: app.authenticate }
  const authEditor = { preHandler: [app.authenticate, app.requireRole('ADMIN', 'EDITOR')] }

  // ── Quota restant ──────────────────────────────────────────────────────────

  app.get('/quota', auth, async (request) => {
    const { tenantId, plan } = request.tenant
    const features  = getPlanFeatures(plan)
    const quotaMois = features.facturesEmissionMois

    const debut = new Date()
    debut.setDate(1); debut.setHours(0, 0, 0, 0)

    const [emises, tenant] = await Promise.all([
      app.db.factureEmission.count({
        where: { tenantId, dateEmission: { gte: debut }, statut: { not: 'BROUILLON' } },
      }),
      app.db.tenant.findUnique({ where: { id: tenantId }, select: { facturesCredit: true } }),
    ])

    const credits = tenant?.facturesCredit ?? 0
    return {
      quotaMois,
      emisesCeMois: emises,
      creditsSupp:  credits,
      restant:      Math.max(0, quotaMois - emises) + credits,
    }
  })

  // ── Prochain numéro de facture ────────────────────────────────────────────

  app.get('/prochain-numero', auth, async (request) => {
    const { tenantId } = request.tenant
    const annee = new Date().getFullYear()
    const count = await app.db.factureEmission.count({
      where: { tenantId, dateEmission: { gte: new Date(`${annee}-01-01`) } },
    })
    const numero = `F-${annee}-${String(count + 1).padStart(3, '0')}`
    return { numero }
  })

  // ── Factures émises ────────────────────────────────────────────────────────

  app.get('/emissions', auth, async (request) => {
    const { tenantId } = request.tenant
    const { page = '1' } = request.query as { page?: string }
    const skip = (Number(page) - 1) * 30
    return app.db.factureEmission.findMany({
      where:   { tenantId },
      orderBy: { dateEmission: 'desc' },
      take:    30,
      skip,
    })
  })

  app.post('/emissions', authEditor, async (request, reply) => {
    const { tenantId, plan } = request.tenant
    const body = EmettreSchema.parse(request.body)
    app.log.info({ tenantId, numero: body.numero }, '[emission] démarrage')

    // ── Vérification quota ──────────────────────────────────────────────────
    const features  = getPlanFeatures(plan)
    const debut = new Date(); debut.setDate(1); debut.setHours(0, 0, 0, 0)

    const [emises, tenant] = await Promise.all([
      app.db.factureEmission.count({
        where: { tenantId, dateEmission: { gte: debut }, statut: { not: 'BROUILLON' } },
      }),
      app.db.tenant.findUnique({ where: { id: tenantId }, select: { facturesCredit: true, name: true, siret: true, adresseLigne1: true, codePostal: true, ville: true, numeroTVA: true, franchiseTva: true, assujettUnique: true } }),
    ])

    const credits   = tenant?.facturesCredit ?? 0
    const restant   = Math.max(0, features.facturesEmissionMois - emises) + credits

    if (restant <= 0) {
      return reply.status(402).send({
        error:    'QuotaFacturesDepasse',
        restant:  0,
        message:  'Quota mensuel de factures atteint. Rechargez votre facturier pour continuer.',
      })
    }

    if (!tenant) return reply.status(500).send({ error: 'TenantIntrouvable' })

    if (!tenant.siret) {
      app.log.warn({ tenantId }, '[emission] SIRET manquant')
      return reply.status(422).send({
        error:   'SiretManquant',
        message: 'Votre SIRET n\'est pas configuré. Renseignez-le dans Réglages → Identité légale avant d\'émettre une facture.',
      })
    }
    app.log.info({ tenantId, siret: tenant.siret, restant }, '[emission] quota OK')

    // ── Calcul totaux ───────────────────────────────────────────────────────
    let montantHT = 0, montantTVA = 0
    for (const l of body.lignes) {
      const ht   = Math.round(l.prixUnitaireHT * l.quantite * 100) / 100
      montantHT  += ht
      montantTVA += Math.round(ht * l.tauxTVA / 100 * 100) / 100
    }
    montantHT  = Math.round(montantHT  * 100) / 100
    montantTVA = Math.round(montantTVA * 100) / 100

    // ── Génération UBL ──────────────────────────────────────────────────────
    const xmlContent = generateUbl({
      ...body,
      dateEmission: new Date(body.dateEmission),
      dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : undefined,
    }, {
      nom:            tenant.name,
      siret:          tenant.siret,
      adresse:        tenant.adresseLigne1 ?? '',
      cp:             tenant.codePostal    ?? '',
      ville:          tenant.ville         ?? '',
      tvaNum:         tenant.numeroTVA     ?? '',
      franchiseTva:   tenant.franchiseTva,
      assujettUnique: tenant.assujettUnique,
    })

    // ── Persistance en BROUILLON (résilience : on sauvegarde avant d'envoyer) ─
    const facture = await app.db.factureEmission.create({
      data: {
        id:                  body.id,
        tenantId,
        numero:              body.numero,
        statut:              'BROUILLON',
        destinataireSiret:   body.destinataireSiret   ?? null,
        destinataireNom:     body.destinataireNom     ?? null,
        destinataireAdresse: body.destinataireAdresse ?? null,
        montantHT,
        montantTVA,
        montantTTC:          montantHT + montantTVA,
        format:              'ubl',
        dateEmission:        new Date(body.dateEmission),
        dateEcheance:        body.dateEcheance ? new Date(body.dateEcheance) : null,
        contenuXml:          xmlContent,
      },
    })

    // ── Envoi au PDP (AFNOR ou SuperPDP selon PDP_MODE) ─────────────────────
    // Émission : toujours via l'API propriétaire SuperPDP (stable).
    // La réception utilise AFNOR (poll-afnor.ts) — les deux sont indépendants.
    app.log.info({ numero: body.numero, siret: tenant.siret }, '[emission] appel SuperPDP')

    let pdpId: string
    try {
      let pdp: ReturnType<typeof getPdpService>
      try { pdp = getPdpService() } catch {
        throw new Error('Le service de facturation n\'est pas encore configuré sur ce serveur.')
      }
      const result = await pdp.emettre(xmlContent)
      pdpId = result.pdpId
      app.log.info({ pdpId }, '[emission] SuperPDP OK')
    } catch (emissionErr: unknown) {
      const detail = (emissionErr as Error).message
      app.log.error({ detail, factureId: facture.id }, '[emission] ERREUR PDP')
      return reply.status(503).send({
        error:     'EmissionEchouee',
        factureId: facture.id,
        message:   'La facture a été créée mais l\'envoi a échoué. Réessayez depuis vos factures émises.',
        detail,
      })
    }

    // ── Mise à jour : BROUILLON → ENVOYEE + décrément crédits si besoin ─────
    const factureEnvoyee = await app.db.$transaction(async (tx) => {
      const f = await tx.factureEmission.update({
        where: { id: facture.id },
        data:  { statut: 'ENVOYEE', pdpId },
      })
      if (emises >= features.facturesEmissionMois && credits > 0) {
        await tx.tenant.update({ where: { id: tenantId }, data: { facturesCredit: { decrement: 1 } } })
      }
      return f
    })

    return reply.status(201).send(factureEnvoyee)
  })

  // ── Réessayer l'envoi d'un BROUILLON ──────────────────────────────────────

  app.post('/emissions/:id/emettre', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }

    const facture = await app.db.factureEmission.findFirst({
      where: { id, tenantId, statut: 'BROUILLON' },
    })
    if (!facture)         return reply.status(404).send({ error: 'BrouillonIntrouvable' })
    if (!facture.contenuXml) return reply.status(422).send({ error: 'XmlManquant' })

    app.log.info({ id, numero: facture.numero }, '[retry] appel SuperPDP')
    let pdpId: string
    try {
      let pdp: ReturnType<typeof getPdpService>
      try { pdp = getPdpService() } catch { throw new Error('Service PDP non configuré') }
      const result = await pdp.emettre(facture.contenuXml)
      pdpId = result.pdpId
      app.log.info({ pdpId }, '[retry] SuperPDP OK')
    } catch (err: unknown) {
      const detail = (err as Error).message
      app.log.error({ detail, id }, '[retry] ERREUR PDP')
      return reply.status(503).send({ error: 'EmissionEchouee', detail })
    }

    const updated = await app.db.factureEmission.update({
      where: { id },
      data:  { statut: 'ENVOYEE', pdpId },
    })
    return reply.send(updated)
  })

  // ── Factures reçues ────────────────────────────────────────────────────────

  app.get('/receptions', auth, async (request) => {
    const { tenantId } = request.tenant
    const { lu } = request.query as { lu?: string }
    return app.db.factureReception.findMany({
      where:   { tenantId, ...(lu !== undefined ? { lu: lu === 'true' } : {}) },
      orderBy: { dateReception: 'desc' },
      take:    50,
    })
  })

  app.patch('/receptions/:id/lu', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const { id } = request.params as { id: string }
    const existing = await app.db.factureReception.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.notFound()
    return app.db.factureReception.update({ where: { id }, data: { lu: true } })
  })

  // ── Non-lu count (pour badge sidebar) ─────────────────────────────────────

  app.get('/receptions/non-lus', auth, async (request) => {
    const { tenantId } = request.tenant
    const count = await app.db.factureReception.count({ where: { tenantId, lu: false } })
    return { count }
  })

  // ── Identité légale (SIRET, adresse — pour les factures) ───────────────────

  app.get('/identite', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.tenant.findUnique({
      where:  { id: tenantId },
      select: { siret: true, adresseLigne1: true, adresseLigne2: true, codePostal: true, ville: true, pays: true, numeroTVA: true, franchiseTva: true, assujettUnique: true },
    })
  })

  app.patch('/identite', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = z.object({
      siret:          z.string().optional().nullable(),
      adresseLigne1:  z.string().optional().nullable(),
      adresseLigne2:  z.string().optional().nullable(),
      codePostal:     z.string().optional().nullable(),
      ville:          z.string().optional().nullable(),
      pays:           z.string().optional().nullable(),
      numeroTVA:      z.string().optional().nullable(),
      franchiseTva:   z.boolean().optional(),
      assujettUnique: z.boolean().optional(),
    }).parse(request.body)
    return app.db.tenant.update({ where: { id: tenantId }, data: body })
  })
}
