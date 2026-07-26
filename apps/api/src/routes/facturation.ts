import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getPlanFeatures } from '@megesti/shared'
import { getPdpServiceForTenant, PdpNonConfigureError } from '../services/SuperPdpService.js'
import { savePieceIdentite } from '../lib/pdpDossierFiles.js'
import { getAfnorService, isAfnorEnabled, siretToSiren } from '../services/AfnorFlowService.js'
import { generateUbl } from '../services/UblGenerator.js'

const toSiren9 = (s: string) => s.replace(/\D/g, '').substring(0, 9)

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

    // ── Vérifier que la facturation électronique est activée ──────────────────
    let pdp
    try {
      pdp = await getPdpServiceForTenant(app.db, tenantId)
    } catch (err) {
      if (err instanceof PdpNonConfigureError) {
        return reply.status(422).send({
          error:   'FacturationElectroniquNonActivee',
          message: 'La facturation électronique n\'est pas activée pour votre compte. Contactez le support Megesti.',
        })
      }
      return reply.status(503).send({
        error:   'PdpIndisponible',
        message: 'Service de facturation électronique indisponible. Réessayez dans quelques instants.',
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

    // ── Récupération companyId (avant génération XML) ────────────────────────
    let pdpCompanyId = toSiren9(tenant.siret)
    try { pdpCompanyId = await pdp.getMyCompanyId() } catch { /* non bloquant */ }

    // ── Génération UBL (avec pdpCompanyId correct) ──────────────────────────
    const emetteurInfo = {
      nom:            tenant.name,
      siret:          tenant.siret,
      adresse:        tenant.adresseLigne1 ?? '',
      cp:             tenant.codePostal    ?? '',
      ville:          tenant.ville         ?? '',
      tvaNum:         tenant.numeroTVA     ?? '',
      franchiseTva:   tenant.franchiseTva,
      assujettUnique: tenant.assujettUnique,
      pdpCompanyId,
    }
    const xmlContent = generateUbl({
      ...body,
      dateEmission: new Date(body.dateEmission),
      dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : undefined,
    }, emetteurInfo)

    // ── Persistance en BROUILLON ─────────────────────────────────────────────
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

    app.log.info({ numero: body.numero, pdpCompanyId }, '[emission] appel PDP')

    let pdpId: string
    try {
      let result: { pdpId: string }
      if (isAfnorEnabled()) {
        // AFNOR : Organization-Id = numéro de société (sandbox: 000000002, prod: SIREN)
        const afnorResult = await getAfnorService().emettre(xmlContent, body.numero, pdpCompanyId)
        result = { pdpId: afnorResult.flowId }
        app.log.info({ flowId: afnorResult.flowId }, '[emission] AFNOR OK')
      } else {
        const pdpResult = await pdp.emettre(xmlContent)
        result = { pdpId: pdpResult.pdpId }
        app.log.info({ pdpId: result.pdpId }, '[emission] SuperPDP OK')
      }
      pdpId = result.pdpId
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
      const pdp = await getPdpServiceForTenant(app.db, tenantId)
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

  // ── Raccordement à la Plateforme Agréée (dossier KYB + statut) ─────────────

  app.get('/raccordement', auth, async (request) => {
    const { tenantId } = request.tenant
    return app.db.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: {
        pdpStatut: true, pdpActivatedAt: true, siret: true,
        pdpDossier: {
          select: {
            representantPrenom: true, representantNom: true, representantEmail: true,
            soumisAt: true, cniPurgeeAt: true,
          },
        },
      },
    })
  })

  const authAdmin = { preHandler: [app.authenticate, app.requireRole('ADMIN')] }
  const CNI_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  app.post('/raccordement', authAdmin, async (request, reply) => {
    const { tenantId } = request.tenant

    const tenant = await app.db.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: { pdpStatut: true, siret: true },
    })
    // Resoumission possible tant que Megesti n'a pas lancé le KYB
    if (tenant.pdpStatut === 'KYB_EN_COURS' || tenant.pdpStatut === 'ACTIF') {
      return reply.conflict('Votre dossier est déjà en cours de traitement. Contactez le support pour le modifier.')
    }
    if (!tenant.siret) {
      return reply.status(422).send({
        error:   'SiretManquant',
        message: 'Renseignez d\'abord votre SIRET dans le bloc « Facturation électronique » ci-dessous.',
      })
    }

    // Multipart : champs texte + fichiers cniRecto / cniVerso
    const champs: Record<string, string> = {}
    const fichiers: Partial<Record<'cniRecto' | 'cniVerso', { buffer: Buffer; mimetype: string }>> = {}
    let mimeInvalide = false

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.fieldname !== 'cniRecto' && part.fieldname !== 'cniVerso') {
          part.file.resume() // drainer les fichiers inattendus sans les stocker
          continue
        }
        if (!CNI_MIMES.includes(part.mimetype)) {
          mimeInvalide = true
          part.file.resume()
          continue
        }
        fichiers[part.fieldname] = { buffer: await part.toBuffer(), mimetype: part.mimetype }
      } else {
        champs[part.fieldname] = String(part.value)
      }
    }

    if (mimeInvalide) {
      return reply.badRequest('Format de fichier non accepté. Formats autorisés : JPEG, PNG, WebP, PDF.')
    }
    if (champs['consentement'] !== 'true') {
      return reply.badRequest('L\'accord formel du représentant légal est requis pour le raccordement.')
    }
    const body = z.object({
      representantPrenom: z.string().min(1),
      representantNom:    z.string().min(1),
      representantEmail:  z.string().email(),
    }).parse(champs)

    if (!fichiers.cniRecto || !fichiers.cniVerso) {
      return reply.badRequest('Les deux faces de la pièce d\'identité sont requises (recto et verso).')
    }

    const rectoPath = await savePieceIdentite(tenantId, 'recto', fichiers.cniRecto.buffer)
    const versoPath = await savePieceIdentite(tenantId, 'verso', fichiers.cniVerso.buffer)

    const dossierData = {
      ...body,
      cniRectoPath: rectoPath,
      cniRectoMime: fichiers.cniRecto.mimetype,
      cniVersoPath: versoPath,
      cniVersoMime: fichiers.cniVerso.mimetype,
      cniPurgeeAt:    null,
      consentementAt: new Date(),
      soumisAt:       new Date(),
    }
    await app.db.$transaction([
      app.db.pdpDossier.upsert({
        where:  { tenantId },
        create: { tenantId, ...dossierData },
        update: dossierData,
      }),
      app.db.tenant.update({ where: { id: tenantId }, data: { pdpStatut: 'DOSSIER_SOUMIS' } }),
    ])
    app.log.info({ tenantId }, '[raccordement] dossier soumis')

    return reply.code(201).send({ pdpStatut: 'DOSSIER_SOUMIS' })
  })
}
