import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const ADMIN_ID  = '00000000-0000-0000-0000-000000000002'
const RAYON_ID  = 'r0000000-0000-0000-0000-000000000001'

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where:  { slug: 'demo' },
    update: {},
    create: {
      id:   TENANT_ID,
      name: "Éditions de la Plume",
      slug: 'demo',
    },
  })

  // ── Admin ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12)
  await prisma.user.upsert({
    where:  { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.fr' } },
    update: {},
    create: {
      id:           ADMIN_ID,
      tenantId:     tenant.id,
      email:        'admin@demo.fr',
      passwordHash,
      firstName:    'Sophie',
      lastName:     'Marchand',
      role:         'ADMIN',
    },
  })

  // ── Rayon ─────────────────────────────────────────────────────────────────
  await prisma.rayon.upsert({
    where:  { id: RAYON_ID },
    update: {},
    create: {
      id:          RAYON_ID,
      tenantId:    TENANT_ID,
      nom:         'Romans & Essais',
      ordre:       0,
      isLibrairie: true,
    },
  })

  // ── Auteurs ───────────────────────────────────────────────────────────────
  const auteurs = await Promise.all([
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000001' },
      update: {},
      create: { id: 'a0000000-0000-0000-0000-000000000001', tenantId: TENANT_ID, prenom: 'Claire', nom: 'Fontaine', email: 'claire.fontaine@email.fr', bio: 'Autrice de romans contemporains, spécialisée dans les portraits de femmes en milieu rural.' },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000002' },
      update: {},
      create: { id: 'a0000000-0000-0000-0000-000000000002', tenantId: TENANT_ID, prenom: 'Marc', nom: 'Delacroix', pseudonyme: 'M.D. Lacroix', bio: 'Auteur de thrillers historiques se déroulant dans la France du XIXe siècle.' },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000003' },
      update: {},
      create: { id: 'a0000000-0000-0000-0000-000000000003', tenantId: TENANT_ID, prenom: 'Yasmine', nom: 'Berrada', email: 'y.berrada@editions-plume.fr', bio: 'Poète et nouvelliste, lauréate du Prix de la SCAM 2021.' },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000004' },
      update: {},
      create: { id: 'a0000000-0000-0000-0000-000000000004', tenantId: TENANT_ID, prenom: 'Thomas', nom: 'Vernet', bio: 'Essayiste et chroniqueur, ancien journaliste au Monde des livres.' },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000005' },
      update: {},
      create: { id: 'a0000000-0000-0000-0000-000000000005', tenantId: TENANT_ID, prenom: 'Lucie', nom: 'Arnaud', pseudonyme: 'L. Arnaud', email: 'lucie.arnaud@email.fr', bio: 'Autrice jeunesse, illustratrice de formation.' },
    }),
  ])

  // ── Articles ──────────────────────────────────────────────────────────────
  const articlesData = [
    { id: 'b0000000-0000-0000-0000-000000000001', nom: 'Les Sillons du Silence',      isbn: '978-2-07-036024-3', prixVenteHT: 19.50, stock: 42,  datePublication: new Date('2023-03-15'), description: 'Dans un village du Massif Central, une femme retrouve les carnets de sa grand-mère et découvre un secret enfoui depuis la Libération.',                                             auteurIds: ['a0000000-0000-0000-0000-000000000001'] },
    { id: 'b0000000-0000-0000-0000-000000000002', nom: "L'Ombre du Palais-Royal",     isbn: '978-2-07-036025-0', prixVenteHT: 21.00, stock: 18,  datePublication: new Date('2022-09-07'), description: "Paris, 1889. Un inspecteur désabusé enquête sur la mort d'un courtisan dans les jardins du Palais-Royal.",                                                                          auteurIds: ['a0000000-0000-0000-0000-000000000002'] },
    { id: 'b0000000-0000-0000-0000-000000000003', nom: "Géographies de l'intime",     isbn: '978-2-07-036026-7', prixVenteHT: 14.00, stock: 0,   datePublication: new Date('2023-10-20'), description: 'Recueil de poèmes traversant les frontières entre le corps, la mémoire et le territoire.',                                                                                          auteurIds: ['a0000000-0000-0000-0000-000000000003'] },
    { id: 'b0000000-0000-0000-0000-000000000004', nom: 'Lire, encore',                isbn: '978-2-07-036027-4', prixVenteHT: 17.00, stock: 67,  datePublication: new Date('2024-01-10'), description: "Un essai lumineux sur la place du livre dans nos vies contemporaines, entre algorithmes et librairies de quartier.",                                                                  auteurIds: ['a0000000-0000-0000-0000-000000000004'] },
    { id: 'b0000000-0000-0000-0000-000000000005', nom: 'La Forêt des Étoiles',        isbn: '978-2-07-036028-1', prixVenteHT: 13.50, stock: 103, datePublication: new Date('2024-04-03'), description: 'Une petite fille et un renard traversent une forêt magique pour rapporter la lumière aux étoiles éteintes.',                                                                          auteurIds: ['a0000000-0000-0000-0000-000000000005'] },
    { id: 'b0000000-0000-0000-0000-000000000006', nom: 'Le Murmure des Pierres',      isbn: '978-2-07-036029-8', prixVenteHT: 22.00, stock: 29,  datePublication: new Date('2023-06-01'), description: "Quand deux voix s'entrelacent — celle d'une géologue et celle d'un berger — pour raconter un même paysage à deux siècles d'écart.",                                                  auteurIds: ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'] },
  ]

  for (const { auteurIds, ...article } of articlesData) {
    await prisma.article.upsert({
      where:  { id: article.id },
      update: {},
      create: {
        ...article,
        tenantId: TENANT_ID,
        rayonId:  RAYON_ID,
        auteurs: {
          create: auteurIds.map((auteurId, ordre) => ({ auteurId, ordre })),
        },
      },
    })
  }

  // ── AdminUser ─────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('EC@fanfanlt678', 12)
  await prisma.adminUser.upsert({
    where:  { email: 'contact@echodeplumes.com' },
    update: {},
    create: {
      email:        'contact@echodeplumes.com',
      nom:          'François',
      passwordHash: superAdminHash,
    },
  })

  console.log(`✓ Tenant   : ${tenant.name}`)
  console.log(`✓ Admin    : admin@demo.fr / demo1234`)
  console.log(`✓ SuperAdmin: contact@echodeplumes.com`)
  console.log(`✓ Auteurs  : ${auteurs.length}`)
  console.log(`✓ Articles : ${articlesData.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
