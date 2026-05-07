import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
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

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Ping santé réseau pour le client mobile (hors auth)
  app.get('/ping', async () => ({ ok: true }))

  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    const user = await app.db.user.findFirst({
      where:   { email: body.email, active: true },
      include: { tenant: { select: { name: true } } },
    })

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.unauthorized('Email ou mot de passe incorrect')
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

  // Mettre à jour son profil
  app.patch('/me', { preHandler: app.authenticate }, async (request) => {
    const { userId } = request.tenant
    const body = PatchMeSchema.parse(request.body)
    return app.db.user.update({
      where: { id: userId },
      data:  body,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true },
    })
  })

  // Changer son mot de passe
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
