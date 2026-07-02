import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const PlanEnum = z.enum(['TRIAL', 'AUTO_EDITION', 'EDITION', 'EDITION_PRO'])

const CreateTenantSchema = z.object({
  name:          z.string().min(1),
  slug:          z.string().min(2).regex(/^[a-z0-9-]+$/),
  plan:          PlanEnum.default('AUTO_EDITION'),
  franchiseTva: z.boolean().default(false),
  adminEmail:    z.string().email(),
  adminPassword: z.string().min(8),
  adminPrenom:   z.string().min(1),
  adminNom:      z.string().min(1),
})

const PatchTenantSchema = z.object({
  plan:  PlanEnum.optional(),
  actif: z.boolean().optional(),
  name:  z.string().min(1).optional(),
})

const CreateUserSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  role:      z.enum(['ADMIN', 'EDITOR', 'AUTHOR']).default('EDITOR'),
})

const PatchUserSchema = z.object({
  active:   z.boolean().optional(),
  password: z.string().min(8).optional(),
  role:     z.enum(['ADMIN', 'EDITOR', 'AUTHOR']).optional(),
})

export const adminTenantRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticateAdmin }

  // ── Liste des tenants ──────────────────────────────────────────────────────
  app.get('/tenants', auth, async () => {
    const tenants = await app.db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, plan: true, actif: true,
        franchiseTva: true, createdAt: true,
        _count: { select: { users: true, ventes: true } },
      },
    })
    return tenants
  })

  // ── Détail d'un tenant ─────────────────────────────────────────────────────
  app.get('/tenants/:id', auth, async (request) => {
    const { id } = request.params as { id: string }
    const tenant = await app.db.tenant.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, name: true, slug: true, plan: true, actif: true,
        franchiseTva: true, createdAt: true, updatedAt: true,
        _count: { select: { users: true, ventes: true, articles: true, salons: true } },
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    return tenant
  })

  // ── Créer un tenant + premier admin ───────────────────────────────────────
  app.post('/tenants', auth, async (request, reply) => {
    const body = CreateTenantSchema.parse(request.body)

    const existing = await app.db.tenant.findUnique({ where: { slug: body.slug } })
    if (existing) return reply.conflict('Ce slug est déjà utilisé')

    const passwordHash = await bcrypt.hash(body.adminPassword, 12)

    const tenant = await app.db.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: body.name,
          slug: body.slug,
          plan: body.plan,
          franchiseTva: body.franchiseTva,
        },
      })
      await tx.user.create({
        data: {
          tenantId:     t.id,
          email:        body.adminEmail,
          passwordHash,
          firstName:    body.adminPrenom,
          lastName:     body.adminNom,
          role:         'ADMIN',
        },
      })
      return t
    })

    return reply.code(201).send(tenant)
  })

  // ── Modifier un tenant (plan, actif, name) ─────────────────────────────────
  app.patch('/tenants/:id', auth, async (request) => {
    const { id } = request.params as { id: string }
    const body = PatchTenantSchema.parse(request.body)
    return app.db.tenant.update({ where: { id }, data: body })
  })

  // ── Utilisateurs d'un tenant ───────────────────────────────────────────────
  app.get('/tenants/:id/users', auth, async (request) => {
    const { id } = request.params as { id: string }
    return app.db.user.findMany({
      where:   { tenantId: id },
      select:  { id: true, email: true, firstName: true, lastName: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  app.post('/tenants/:id/users', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateUserSchema.parse(request.body)
    const { password, ...rest } = body
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await app.db.user.create({
      data: { tenantId: id, ...rest, passwordHash } as any,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    })
    return reply.code(201).send(user)
  })

  app.patch('/tenants/:id/users/:userId', auth, async (request) => {
    const { userId } = request.params as { id: string; userId: string }
    const body = PatchUserSchema.parse(request.body)
    const data: Record<string, unknown> = {}
    if (body.active !== undefined) data['active'] = body.active
    if (body.role !== undefined)   data['role']   = body.role
    if (body.password)             data['passwordHash'] = await bcrypt.hash(body.password, 12)
    return app.db.user.update({
      where:  { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    })
  })
}
