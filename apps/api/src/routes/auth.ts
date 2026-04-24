import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    const user = await app.db.user.findFirst({
      where: { email: body.email, active: true },
    })

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.unauthorized('Email ou mot de passe incorrect')
    }

    const token = app.jwt.sign({
      tenantId: user.tenantId,
      userId:   user.id,
      role:     user.role,
    })

    return { token }
  })

  app.get('/me', { preHandler: app.authenticate }, async (request) => {
    const { userId, tenantId } = request.tenant
    const user = await app.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true },
    })
    return user
  })
}
