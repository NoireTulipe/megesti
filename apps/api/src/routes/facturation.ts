import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getPlanFeatures } from '@megesti/shared'
import { createPdpService } from '../services/SuperPdpService.js'
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

    // ── Vérification quota ──────────────────────────────────────────────────
    const features  = getPlanFeatures(plan)
    const debut = new Date(); debut.setDate(1); debut.setHours(0, 0, 0, 0)

    const [emises, tenant] = await Promise.all([
      app.db.factureEmission.count({
        where: { tenantId, dateEmission: { gte: debut }, statut: { not: 'BROUILLON' } },
      }),
      app.db.tenant.findUnique({ where: { id: tenantId }, select: { facturesCredit: true, pdpClientId: true, pdpClientSecret: true, name: true, siret: true, adresseLigne1: true, codePostal: true, ville: true, numeroTVA: true } }),
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

    // ── Vérification config PDP ─────────────────────────────────────────────
    if (!tenant?.pdpClientId || !tenant?.pdpClientSecret) {
      return reply.status(422).send({
        error:   'PdpNonConfigured',
        message: 'Configurez vos identifiants superpdp.tech dans les réglages de votre compte.',
      })
    }

    // ── Génération UBL ──────────────────────────────────────────────────────
    const emetteur = {
      nom:     tenant.name,
      siret:   tenant.siret ?? '',
      adresse: tenant.adresseLigne1 ?? '',
      cp:      tenant.codePostal ?? '',
      ville:   tenant.ville ?? '',
      tvaNum:  tenant.numeroTVA ?? '',
    }
    const xmlContent = generateUbl({ ...body, dateEmission: new Date(body.dateEmission) }, emetteur)

    // ── Envoi à superpdp ────────────────────────────────────────────────────
    const pdp = createPdpService(tenant.pdpClientId, tenant.pdpClientSecret)
    const { pdpId, statut } = await pdp.emettre(xmlContent)

    // ── Calcul totaux ───────────────────────────────────────────────────────
    let montantHT = 0, montantTVA = 0
    for (const l of body.lignes) {
      const ht  = l.prixUnitaireHT * l.quantite
      montantHT  += ht
      montantTVA += ht * l.tauxTVA / 100
    }

    // ── Persistance ─────────────────────────────────────────────────────────
    const facture = await app.db.$transaction(async (tx) => {
      const f = await tx.factureEmission.create({
        data: {
          id:                body.id,
          tenantId,
          numero:            body.numero,
          statut:            'ENVOYEE',
          destinataireSiret: body.destinataireSiret ?? null,
          destinataireNom:   body.destinataireNom   ?? null,
          montantHT:         montantHT,
          montantTVA:        montantTVA,
          montantTTC:        montantHT + montantTVA,
          format:            'ubl',
          pdpId,
          dateEmission:      new Date(body.dateEmission),
          dateEcheance:      body.dateEcheance ? new Date(body.dateEcheance) : null,
          contenuXml:        xmlContent,
        },
      })

      // Décrémente les crédits supplémentaires si le quota plan est dépassé
      if (emises >= features.facturesEmissionMois && credits > 0) {
        await tx.tenant.update({ where: { id: tenantId }, data: { facturesCredit: { decrement: 1 } } })
      }

      return f
    })

    return reply.status(201).send(facture)
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

  // ── Config PDP (réglages tenant) ───────────────────────────────────────────

  app.get('/config', auth, async (request) => {
    const { tenantId } = request.tenant
    const tenant = await app.db.tenant.findUnique({
      where:  { id: tenantId },
      select: { pdpClientId: true, siret: true, adresseLigne1: true, adresseLigne2: true, codePostal: true, ville: true, pays: true, numeroTVA: true },
    })
    // Ne jamais retourner le client_secret
    return { ...tenant, pdpConfigured: !!tenant?.pdpClientId }
  })

  app.patch('/config', authEditor, async (request, reply) => {
    const { tenantId } = request.tenant
    const body = z.object({
      pdpClientId:     z.string().optional().nullable(),
      pdpClientSecret: z.string().optional().nullable(),
      siret:           z.string().optional().nullable(),
      adresseLigne1:   z.string().optional().nullable(),
      adresseLigne2:   z.string().optional().nullable(),
      codePostal:      z.string().optional().nullable(),
      ville:           z.string().optional().nullable(),
      pays:            z.string().optional().nullable(),
      numeroTVA:       z.string().optional().nullable(),
    }).parse(request.body)

    return app.db.tenant.update({ where: { id: tenantId }, data: body })
  })
}
