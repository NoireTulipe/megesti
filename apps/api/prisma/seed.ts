import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const ADMIN_ID  = '00000000-0000-0000-0000-000000000002'

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

  // ── Auteurs ───────────────────────────────────────────────────────────────
  const auteurs = await Promise.all([
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'a0000000-0000-0000-0000-000000000001',
        tenantId: TENANT_ID,
        prenom: 'Claire', nom: 'Fontaine',
        email: 'claire.fontaine@email.fr',
        bio: 'Autrice de romans contemporains, spécialisée dans les portraits de femmes en milieu rural.',
      },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'a0000000-0000-0000-0000-000000000002',
        tenantId: TENANT_ID,
        prenom: 'Marc', nom: 'Delacroix',
        pseudonyme: 'M.D. Lacroix',
        bio: 'Auteur de thrillers historiques se déroulant dans la France du XIXe siècle.',
      },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'a0000000-0000-0000-0000-000000000003',
        tenantId: TENANT_ID,
        prenom: 'Yasmine', nom: 'Berrada',
        email: 'y.berrada@editions-plume.fr',
        bio: 'Poète et nouvelliste, lauréate du Prix de la SCAM 2021.',
      },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: 'a0000000-0000-0000-0000-000000000004',
        tenantId: TENANT_ID,
        prenom: 'Thomas', nom: 'Vernet',
        bio: 'Essayiste et chroniqueur, ancien journaliste au Monde des livres.',
      },
    }),
    prisma.auteur.upsert({
      where:  { id: 'a0000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: 'a0000000-0000-0000-0000-000000000005',
        tenantId: TENANT_ID,
        prenom: 'Lucie', nom: 'Arnaud',
        pseudonyme: 'L. Arnaud',
        email: 'lucie.arnaud@email.fr',
        bio: 'Autrice jeunesse, illustratrice de formation.',
      },
    }),
  ])

  // ── Livres ────────────────────────────────────────────────────────────────
  const livresData = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      titre: 'Les Sillons du Silence',
      isbn: '978-2-07-036024-3',
      prix: 19.50,
      stock: 42,
      datePublication: new Date('2023-03-15'),
      description: 'Dans un village du Massif Central, une femme retrouve les carnets de sa grand-mère et découvre un secret enfoui depuis la Libération.',
      auteurIds: ['a0000000-0000-0000-0000-000000000001'],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      titre: 'L\'Ombre du Palais-Royal',
      isbn: '978-2-07-036025-0',
      prix: 21.00,
      stock: 18,
      datePublication: new Date('2022-09-07'),
      description: 'Paris, 1889. Un inspecteur désabusé enquête sur la mort d\'un courtisan dans les jardins du Palais-Royal.',
      auteurIds: ['a0000000-0000-0000-0000-000000000002'],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      titre: 'Géographies de l\'intime',
      isbn: '978-2-07-036026-7',
      prix: 14.00,
      stock: 0,
      datePublication: new Date('2023-10-20'),
      description: 'Recueil de poèmes traversant les frontières entre le corps, la mémoire et le territoire.',
      auteurIds: ['a0000000-0000-0000-0000-000000000003'],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      titre: 'Lire, encore',
      isbn: '978-2-07-036027-4',
      prix: 17.00,
      stock: 67,
      datePublication: new Date('2024-01-10'),
      description: 'Un essai lumineux sur la place du livre dans nos vies contemporaines, entre algorithmes et librairies de quartier.',
      auteurIds: ['a0000000-0000-0000-0000-000000000004'],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      titre: 'La Forêt des Étoiles',
      isbn: '978-2-07-036028-1',
      prix: 13.50,
      stock: 103,
      datePublication: new Date('2024-04-03'),
      description: 'Une petite fille et un renard traversent une forêt magique pour rapporter la lumière aux étoiles éteintes.',
      auteurIds: ['a0000000-0000-0000-0000-000000000005'],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000006',
      titre: 'Le Murmure des Pierres',
      isbn: '978-2-07-036029-8',
      prix: 22.00,
      stock: 29,
      datePublication: new Date('2023-06-01'),
      description: 'Quand deux voix s\'entrelacent — celle d\'une géologue et celle d\'un berger — pour raconter un même paysage à deux siècles d\'écart.',
      auteurIds: [
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000003',
      ],
    },
  ]

  for (const { auteurIds, ...livre } of livresData) {
    await prisma.livre.upsert({
      where:  { id: livre.id },
      update: {},
      create: {
        ...livre,
        tenantId: TENANT_ID,
        auteurs: {
          create: auteurIds.map((auteurId, ordre) => ({ auteurId, ordre })),
        },
      },
    })
  }

  console.log(`✓ Tenant   : ${tenant.name}`)
  console.log(`✓ Admin    : admin@demo.fr / demo1234`)
  console.log(`✓ Auteurs  : ${auteurs.length}`)
  console.log(`✓ Livres   : ${livresData.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
