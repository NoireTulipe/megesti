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

  // ── MeGestine dialogs ────────────────────────────────────────────────────────
  const dialogs = [
    { slug: 'catalogue-no-rayon',   description: 'Catalogue — aucun rayon créé', bulles: [
      { title: 'Par ici ! 👋', text: 'Avant d\'ajouter ton premier article, crée au moins un rayon et une catégorie pour structurer ton catalogue.' },
      { text: 'Rends-toi dans les Réglages pour organiser ton catalogue en rayons (Librairie, Goodies…) puis en catégories.', cta: { label: 'Réglages → Rayons & Catégories →', href: '/reglages' } },
    ]},
    { slug: 'catalogue-no-article', description: 'Catalogue — rayons OK mais aucun article', bulles: [
      { title: 'C\'est parti ! 🎉', text: 'Ton catalogue est prêt. Ajoute maintenant ton premier article — livre, goodie, affiche… tout ce que tu vends !', cta: { label: 'Ajouter mon premier article', href: '' } },
      { text: 'L\'onglet Catalogue affiche tous les produits actuellement disponibles à la vente. C\'est la vitrine active de ta maison d\'édition.' },
      { text: 'L\'onglet Retirés accueille les articles mis de côté. Ils ne sont plus en vente mais ne sont pas supprimés — tu peux les réactiver à tout moment.' },
    ]},
    { slug: 'pdv-no-categorie', description: 'Points de vente — aucune catégorie', bulles: [
      { title: 'Les points de vente, c\'est quoi ? 🏪', text: 'Un point de vente est un lieu ou canal où tu vends tes produits — un stand en salon, une librairie partenaire, ta boutique… Chaque PDV a ses propres sessions, statistiques et mode d\'encaissement.' },
      { text: 'Pour s\'y retrouver, MeGesti organise tes points de vente en catégories — Salon littéraire, Librairie indépendante, Centre culturel… C\'est toi qui les définis. Commence par créer ta première catégorie.', cta: { label: 'Créer ma première catégorie →', href: '' } },
    ]},
    { slug: 'pdv-no-pdv', description: 'Points de vente — catégorie OK mais aucun PDV', bulles: [
      { title: 'La première catégorie est là ! 🎉', text: 'Maintenant, ajoute ton premier point de vente. MeGesti saura ainsi où se sont déroulées tes ventes et pourra te donner des statistiques par lieu.' },
      { text: '💡 Lors de la création, choisis le mode d\'encaissement :\n🏪 Tu encaisses toi-même (CB, espèces, chèque…)\n🏬 Le point de vente encaisse et te reverse ensuite ta part.', cta: { label: 'Ajouter mon premier point de vente →', href: '' } },
    ]},
    { slug: 'caisse-no-pdv', description: 'Caisse — aucun point de vente', bulles: [
      { title: 'Bienvenue dans la Caisse ! 🏪', text: 'C\'est ici que tu centralises toutes tes ventes — lors d\'un salon, d\'une expo, en boutique ou ponctuellement. Chaque euro encaissé passe par ici.' },
      { text: 'Avant de commencer à vendre, il te faut au moins un Point de vente — le lieu où se déroulera ta vente. Tu peux en créer autant que tu veux et avoir plusieurs sessions actives simultanément.', cta: { label: 'Créer mon premier point de vente →', href: '/points-de-vente' } },
    ]},
    { slug: 'caisse-premiere-session', description: 'Caisse — PDV OK mais jamais de session', bulles: [
      { title: 'Tout est en place ! 🎉', text: 'Pour enregistrer des ventes, deux modes s\'offrent à toi :' },
      { text: '📦 La session — tu l\'ouvres au début d\'une journée de vente, tu enregistres tous tes clients au fil de la journée, puis tu la fermes en fin de journée. Idéal pour un salon, une expo, un marché. Plusieurs sessions peuvent tourner en même temps.' },
      { text: '⚡ La vente hors session — pour le coup ponctuel et rapide : un lecteur te contacte directement, tu enregistres sa commande en deux clics, sans ouvrir de session.', cta: { label: 'Ouvrir ma première session →', href: '' } },
    ]},
    { slug: 'caisse-no-active', description: 'Caisse — sessions passées mais aucune ouverte', bulles: [
      { title: 'Prêt à reprendre ? 👋', text: 'Ouvre une session pour démarrer une journée de vente dans un point de vente. Pour une vente rapide et isolée, utilise le bouton Vente hors session en haut de page.', cta: { label: 'Ouvrir une session →', href: '' } },
    ]},
    { slug: 'salons-vide', description: 'Salons — aucun salon enregistré', bulles: [
      { title: 'Ton carnet de salons ! 📅', text: 'Ici, tu références tous les salons et événements qui t\'intéressent — salons du livre, festivals, marchés… Passés ou à venir, garde-les tous ici pour construire ton calendrier annuel.' },
      { text: 'Pour chaque salon : les dates et le lieu, les coordonnées de l\'organisateur, le coût du stand… Et surtout, MeGesti conserve le CA des éditions précédentes pour t\'aider à décider si l\'événement vaut le déplacement.' },
      { text: 'Depuis la fiche d\'un salon, tu peux créer directement un Point de vente associé. Tes sessions de caisse seront automatiquement liées au salon, sans ressaisie.', cta: { label: 'Référencer mon premier salon →', href: '' } },
    ]},
    { slug: 'stats-no-data', description: 'Statistiques — aucune vente sur la période', bulles: [
      { title: 'Tes statistiques de ventes 📊', text: 'C\'est ici que se trouvent tes performances commerciales en un coup d\'œil : chiffre d\'affaires, progression dans le temps, articles les plus vendus et les plus rentables, points de vente les plus performants, modes de paiement préférés de tes clients… tout est centralisé.' },
      { text: 'Tu peux filtrer par période — 7 jours, 30 jours, 3 mois, un an ou depuis le tout début — pour suivre tes tendances, comparer tes résultats d\'un salon à l\'autre et identifier tes bestsellers.' },
      { text: 'Pour que les données apparaissent, il te faut au moins une session de caisse clôturée avec des ventes enregistrées. Si tu viens de changer la période, essaie d\'élargir l\'intervalle !', cta: { label: 'Aller à la Caisse →', href: '/ventes' } },
    ]},
    { slug: 'bilan-no-data', description: 'Bilan — aucune donnée disponible', bulles: [
      { title: 'Ton bilan financier 💼', text: 'C\'est ta boussole comptable. En un seul regard, tu vois la santé financière réelle de ta maison d\'édition : ce que tu as vendu, encaissé, dépensé — et surtout ce qu\'il te reste vraiment.' },
      { text: 'Tu suis tes entrées (ventes en session, dépôts libraires, reversements PDV…) et tes sorties (frais de salon, droits d\'auteurs versés, charges, coût des ventes…) avec un comparatif effectif vs prévisionnel pour anticiper sans jamais être surpris.' },
      { text: 'Au programme : un compte de résultat simplifié du CA au résultat net, une estimation de la valeur de ton stock, et des alertes sur les charges à venir pour piloter ta trésorerie en temps réel.' },
      { text: 'Pour que tout s\'affiche, il te faut au moins une session de caisse clôturée avec des ventes enregistrées. Lance ta première session et reviens ici — les chiffres t\'en apprendront plus sur ton activité que n\'importe quel tableur !', cta: { label: 'Aller à la Caisse →', href: '/ventes' } },
    ]},
    { slug: 'maisons-vide', description: 'Maisons d\'édition — aucune entrée', bulles: [
      { title: 'Ton carnet de maisons d\'édition ! 📚', text: 'Ici, tu recenses les maisons d\'édition partenaires ou celles que tu surveilles — concurrentes, complémentaires, coéditrices potentielles… C\'est la mémoire de ton réseau professionnel éditorial.\n\nEt pourquoi pas y noter la maison d\'édition qui te fait de l\'œil… ou celle qui pourrait bien te faire signe un jour ? 😉' },
      { text: 'Pour chaque maison, tu notes ses contacts clés, son adresse, son site, ses spécialités… Plus besoin de chercher un numéro de téléphone en plein salon quand on n\'a pas le temps.' },
      { text: 'Ce carnet prend de la valeur avec le temps. Un bon réseau éditorial ouvre des portes : coéditions, co-stands en salon, échanges de bons procédés, recommandations croisées… Commence dès maintenant.', cta: { label: 'Ajouter une maison d\'édition →', href: '' } },
    ]},
  ]

  let dialogCount = 0
  for (const d of dialogs) {
    await prisma.mascoteDialog.upsert({
      where:  { slug: d.slug },
      update: { description: d.description, bulles: d.bulles as any, actif: true },
      create: { slug: d.slug, description: d.description, bulles: d.bulles as any, actif: true },
    })
    dialogCount++
  }

  console.log(`✓ Tenant   : ${tenant.name}`)
  console.log(`✓ Admin    : admin@demo.fr / demo1234`)
  console.log(`✓ SuperAdmin: contact@echodeplumes.com`)
  console.log(`✓ Dialogs MeGestine : ${dialogCount}`)
  console.log(`✓ Auteurs  : ${auteurs.length}`)
  console.log(`✓ Articles : ${articlesData.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
