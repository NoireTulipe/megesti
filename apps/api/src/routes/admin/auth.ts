import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    const admin = await app.db.adminUser.findUnique({ where: { email: body.email } })

    if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      return reply.unauthorized('Email ou mot de passe incorrect')
    }

    const token = app.jwt.sign({ adminId: admin.id, role: 'SUPERADMIN' })
    return { token, nom: admin.nom, email: admin.email }
  })

  app.get('/me', { preHandler: app.authenticateAdmin }, async (request) => {
    const admin = await app.db.adminUser.findUniqueOrThrow({
      where:  { id: request.admin.adminId },
      select: { id: true, email: true, nom: true },
    })
    return admin
  })
}
