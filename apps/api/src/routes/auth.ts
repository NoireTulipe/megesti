import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'node:crypto'
import { creerMailer } from '../services/mailer/index.js'

/** Duree de validite d'un lien de reinitialisation. */
const RESET_VALIDITE_MS = 60 * 60 * 1000 // 1 heure

/** Le jeton circule en clair dans l'e-mail, seul son hache est stocke. */
function hacherJeton(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex')
}

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  slug:     z.string().optional(), // slug du tenant pour login scopé
})

const PatchMeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName:  z.string().min(1).optional(),
  email:     z.string().email().optional(),
})

const PasswordSchema = z.object({
  current: z.string().min(1),
  new:     z.string().min(8),
})

const ForgotSchema = z.object({
  email: z.string().email(),
  slug:  z.string().optional(),
})

const ResetSchema = z.object({
  token:    z.string().min(20),
  password: z.string().min(8),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Ping santé réseau pour le client mobile (hors auth)
  app.get('/ping', async () => ({ ok: true }))

  // ── Info tenant publique (pour page de connexion par slug) ──
  app.get('/tenant/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const tenant = await app.db.tenant.findUnique({
      where:  { slug },
      select: { name: true, slug: true, logo: true, actif: true },
    })
    if (!tenant || !tenant.actif) return reply.notFound('Espace non trouvé')
    return { name: tenant.name, slug: tenant.slug, logo: tenant.logo }
  })

  app.post('/login', {
    // Anti brute-force : 10 tentatives/min/IP
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    // Si slug fourni → login scopé au tenant (multi-tenant propre)
    let tenantId: string | undefined
    if (body.slug) {
      const tenant = await app.db.tenant.findUnique({
        where: { slug: body.slug },
        select: { id: true, actif: true },
      })
      if (!tenant || !tenant.actif) return reply.unauthorized('Email ou mot de passe incorrect')
      tenantId = tenant.id
    }

    const user = await app.db.user.findFirst({
      where: {
        email:  body.email,
        active: true,
        ...(tenantId ? { tenantId } : {}),
      },
      include: { tenant: { select: { name: true } } },
    })

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.unauthorized('Email ou mot de passe incorrect')
    }

    // L'espace auteurs n'est pas ouvert. Tant que les lectures ne sont pas
    // filtrées par rôle (GET /droits-auteur, /ventes… sont en `authenticate`
    // seul), un compte AUTHOR verrait toutes les données du tenant — y compris
    // les droits des autres auteurs. Barrière au login en attendant.
    if (user.role === 'AUTHOR') {
      return reply.forbidden("L'espace auteurs n'est pas encore ouvert.")
    }

    const token = app.jwt.sign({
      sub:        user.id,
      tenantId:   user.tenantId,
      userId:     user.id,
      role:       user.role,
      email:      user.email,
      firstName:  user.firstName,
      lastName:   user.lastName,
      tenantName: user.tenant.name,
    })

    return { token }
  })

  app.get('/me', { preHandler: app.authenticate }, async (request) => {
    const { userId } = request.tenant
    const user = await app.db.user.findUniqueOrThrow({
      where:  { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true,
        tenant: { select: { name: true } },
      },
    })
    return {
      id: user.id, email: user.email,
      firstName: user.firstName, lastName: user.lastName,
      role: user.role, tenantId: user.tenantId,
      tenantName: user.tenant.name,
    }
  })

  app.patch('/me', { preHandler: app.authenticate }, async (request) => {
    const { userId } = request.tenant
    const body = PatchMeSchema.parse(request.body)
    return app.db.user.update({
      where: { id: userId },
      data:  body,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true },
    })
  })

  // ── Mot de passe oublie ────────────────────────────────────────────────────

  /**
   * Demande de reinitialisation.
   *
   * Repond TOUJOURS 200, meme si l'adresse est inconnue : sinon la route
   * devient un outil d'enumeration des comptes clients.
   */
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request) => {
    const body = ForgotSchema.parse(request.body)
    const reponse = { ok: true as const }

    let tenantId: string | undefined
    if (body.slug) {
      const tenant = await app.db.tenant.findUnique({
        where:  { slug: body.slug },
        select: { id: true, actif: true },
      })
      if (!tenant || !tenant.actif) return reponse
      tenantId = tenant.id
    }

    const user = await app.db.user.findFirst({
      where: { email: body.email, active: true, ...(tenantId ? { tenantId } : {}) },
    })
    // Compte inconnu, inactif, ou auteur (espace pas encore ouvert) : on sort
    // sans rien dire.
    if (!user || user.role === 'AUTHOR') return reponse

    // Les demandes precedentes encore valides sont invalidees : un seul lien
    // actif a la fois.
    await app.db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data:  { usedAt: new Date() },
    })

    const jeton = randomBytes(32).toString('base64url')
    await app.db.passwordResetToken.create({
      data: {
        userId:    user.id,
        tokenHash: hacherJeton(jeton),
        expiresAt: new Date(Date.now() + RESET_VALIDITE_MS),
      },
    })

    const base = (process.env['APP_URL'] ?? 'http://localhost:5173').replace(/\/+$/, '')
    const lien = `${base}/reinitialiser-mot-de-passe?token=${jeton}`

    try {
      await creerMailer().envoyer({
        to:      user.email,
        subject: 'Reinitialisation de votre mot de passe MeGesti',
        text: [
          `Bonjour ${user.firstName},`,
          '',
          'Vous avez demande a reinitialiser votre mot de passe MeGesti.',
          'Cliquez sur le lien ci-dessous — il est valable une heure :',
          '',
          lien,
          '',
          "Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail :",
          'votre mot de passe actuel reste valable.',
          '',
          "L'equipe MeGesti",
        ].join('\n'),
      })
    } catch (err) {
      // L'envoi a echoue : on le trace, mais on ne le dit pas au client — sinon
      // la reponse differe selon que le compte existe ou non.
      request.log.error({ err }, "echec d'envoi du mail de reinitialisation")
    }

    return reponse
  })

  /** Consomme un jeton et remplace le mot de passe. */
  app.post('/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = ResetSchema.parse(request.body)

    const enregistrement = await app.db.passwordResetToken.findUnique({
      where:   { tokenHash: hacherJeton(body.token) },
      include: { user: true },
    })

    if (!enregistrement || enregistrement.usedAt || enregistrement.expiresAt < new Date()) {
      return reply.badRequest('Ce lien est invalide ou a expire. Demandez-en un nouveau.')
    }
    if (!enregistrement.user.active) {
      return reply.badRequest('Ce lien est invalide ou a expire. Demandez-en un nouveau.')
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    // Jeton marque comme utilise dans la meme transaction que le changement :
    // pas de fenetre ou il servirait deux fois.
    await app.db.$transaction([
      app.db.user.update({ where: { id: enregistrement.userId }, data: { passwordHash } }),
      app.db.passwordResetToken.update({ where: { id: enregistrement.id }, data: { usedAt: new Date() } }),
    ])

    return { ok: true }
  })

  app.patch('/password', { preHandler: app.authenticate }, async (request, reply) => {
    const { userId } = request.tenant
    const body = PasswordSchema.parse(request.body)
    const user = await app.db.user.findUniqueOrThrow({ where: { id: userId } })
    const valid = await bcrypt.compare(body.current, user.passwordHash)
    if (!valid) return reply.status(403).send({ message: 'Mot de passe actuel incorrect' })
    const passwordHash = await bcrypt.hash(body.new, 12)
    await app.db.user.update({ where: { id: userId }, data: { passwordHash } })
    return { ok: true }
  })
}
