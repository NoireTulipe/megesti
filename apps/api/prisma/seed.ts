import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── AdminUser ────────────────────────────────────────────────────────────────
  const email    = process.env['ADMIN_EMAIL']    ?? (() => { throw new Error('ADMIN_EMAIL requis') })()
  const password = process.env['ADMIN_PASSWORD'] ?? (() => { throw new Error('ADMIN_PASSWORD requis') })()
  const nom      = process.env['ADMIN_NOM']      ?? 'Super Admin'

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`✓ Admin "${email}" existe déjà — skipped`)
  } else {
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.adminUser.create({ data: { email, passwordHash, nom } })
    console.log(`✓ Admin "${email}" créé`)
  }

  // ── MeGestine dialogs (crée seulement si absent — ne touche pas aux éditions admin) ──
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
    { slug: 'catalogue-lien-rayons', description: 'Catalogue — rappel discret vers réglages rayons/catégories', bulles: [
      { text: 'Rayons, catégories, TVA, champs personnalisés… tout se configure dans les Réglages.', cta: { label: 'Réglages → Rayons & Catégories', href: '/reglages' } },
    ]},

    { slug: 'catalogue-retires-vide', description: 'Catalogue / onglet Retirés — aucun article retiré', bulles: [
      { title: 'Vos articles retirés atterrissent ici 📦', text: 'Cet espace accueille les articles que vous avez mis de côté — produits épuisés, éditions terminées, références que vous ne souhaitez plus proposer pour l\'instant.\n\nUne fois retirés, ils disparaissent de la caisse, de l\'application mobile, et ne sont plus proposés à la vente.' },
      { text: 'Ils ne disparaissent pas de vos statistiques ni de votre historique de ventes — votre bilan reste intact. Et ils ne consomment plus de crédits dans votre quota d\'articles actifs.' },
      { text: 'Un article retiré peut être réintégré en un seul clic : il revient immédiatement dans l\'onglet Catalogue et redevient disponible à la vente. Aucune donnée n\'est perdue.' },
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
    { slug: 'auteurs-vide', description: 'Auteurs — aucun auteur enregistré (switch ME ou Réseau)', bulles: [
      { title: 'Tes auteurs, centralisés ici ✍️', text: 'Cette page regroupe tous les auteurs avec qui tu travailles ou que tu suis. C\'est le point de départ pour gérer les contrats, calculer les droits et piloter tes reversements — tout ce qui touche à la relation auteur.' },
      { text: '📂 L\'onglet Réseau te donne accès à la base partagée d\'auteurs référencés sur MeGesti — utile pour retrouver un auteur déjà enregistré par une autre maison, éviter les doublons et enrichir automatiquement les fiches.\n\n👥 L\'onglet ME liste les auteurs directement rattachés à ta maison d\'édition, avec leurs contrats, leurs œuvres et le calcul de leurs droits.' },
      { text: '💡 Les auteurs ME — avec gestion de contrats et calcul automatique des droits — sont disponibles à partir du plan Édition. En plan Auto-édition, tu peux consulter le Réseau et importer des auteurs, mais la gestion contractuelle est réservée aux structures qui publient plusieurs auteurs.', cta: { label: 'Ajouter mon premier auteur →', href: '' } },
    ]},

    { slug: 'facturation-quota-epuise', description: 'Facturation — quota mensuel épuisé, proposition de rechargement', bulles: [
      { title: 'Notre facturier est vide !', text: 'Vous avez utilisé toutes vos factures du mois. Pas de panique : rechargez votre facturier en un clic et continuez à émettre sans interruption.' },
      { text: 'Le rechargement est immédiat. Vos factures sont disponibles dès la confirmation du paiement.', cta: { label: 'Recharger mon facturier →', href: '' } },
    ]},

    { slug: 'facturation-pdp-non-configure', description: 'Facturation — identifiants superpdp manquants', bulles: [
      { title: 'Configuration requise', text: 'Pour émettre des factures électroniques, renseignez vos identifiants superpdp.tech dans les réglages de votre compte (section Facturation électronique).' },
      { text: 'Il vous faut un compte sur superpdp.tech avec une application créée pour votre entreprise. L\'opération prend 5 minutes.', cta: { label: 'Réglages → Facturation', href: '/reglages' } },
    ]},

    { slug: 'depots-vide', description: 'Dépôts libraires — aucun dépôt enregistré', bulles: [
      { title: 'Tes dépôts en librairie 📚', text: 'Tu confies des exemplaires de tes livres à une librairie partenaire — elle les expose, les vend pour toi à ton prix public, et te reverse ta part selon une commission convenue. C\'est le dépôt-vente : tu restes propriétaire des livres jusqu\'à leur vente, aucun intermédiaire ne te les rachète.' },
      { text: 'Pour chaque dépôt, MeGesti suit les quantités envoyées, les quantités vendues et ce qu\'il reste en rayon. Fini les calculs sur un coin de nappe : tu sais à tout moment ce que chaque librairie te doit.' },
      { text: 'Quand la librairie te verse ta part, enregistre le reversement ici. MeGesti met à jour le solde et conserve l\'historique — précieux pour ta comptabilité et tes relations partenaires.', cta: { label: 'Référencer ma première librairie →', href: '' } },
    ]},

    { slug: 'maisons-vide', description: 'Maisons d\'édition — aucune entrée', bulles: [
      { title: 'Ton carnet de maisons d\'édition ! 📚', text: 'Ici, tu recenses les maisons d\'édition partenaires ou celles que tu surveilles — concurrentes, complémentaires, coéditrices potentielles… C\'est la mémoire de ton réseau professionnel éditorial.\n\nEt pourquoi pas y noter la maison d\'édition qui te fait de l\'œil… ou celle qui pourrait bien te faire signe un jour ? 😉' },
      { text: 'Pour chaque maison, tu notes ses contacts clés, son adresse, son site, ses spécialités… Plus besoin de chercher un numéro de téléphone en plein salon quand on n\'a pas le temps.' },
      { text: 'Ce carnet prend de la valeur avec le temps. Un bon réseau éditorial ouvre des portes : coéditions, co-stands en salon, échanges de bons procédés, recommandations croisées… Commence dès maintenant.', cta: { label: 'Ajouter une maison d\'édition →', href: '' } },
    ]},

    // ── Bilan session — aides métriques ──────────────────────────────────────

    { slug: 'bilan-metric-ca-ttc', description: "Bilan — chiffre d'affaires total", bulles: [
      { title: "Chiffre d'affaires total", text: "Somme de toutes les ventes validées de cette session, toutes taxes comprises. Le montant hors taxe affiché dessous sert de base au calcul de la TVA et des droits d'auteurs." },
    ]},
    { slug: 'bilan-metric-en-caisse', description: "Bilan — montant encaissé directement", bulles: [
      { title: "Montant encaissé directement", text: "Part du chiffre d'affaires que tu as encaissée toi-même (carte, espèces, chèque…). Le montant « + X € PDV » correspond aux ventes réglées par le point de vente partenaire — il te sera reversé selon les modalités convenues." },
    ]},
    { slug: 'bilan-metric-ticket-moyen', description: "Bilan — ticket moyen", bulles: [
      { title: "Ticket moyen", text: "Chiffre d'affaires total ÷ nombre de ventes validées. Un bon indicateur pour évaluer si les clients achètent plusieurs articles ou un seul à chaque passage." },
    ]},
    { slug: 'bilan-metric-frais', description: "Bilan — frais de session", bulles: [
      { title: "Frais de session", text: "Total des dépenses liées à cette session : stand, déplacement, repas, hébergement… Déduits du bénéfice estimé mais sans impact sur le chiffre d'affaires. Les frais annulés (rayés) ne sont pas comptabilisés." },
    ]},
    { slug: 'bilan-metric-commission-pdv', description: "Bilan — commission du point de vente", bulles: [
      { title: "Commission du point de vente", text: "Frais prélevés par le point de vente partenaire sur les ventes qu'il encaisse pour toi. Il peut être forfaitaire (montant fixe) ou proportionnel (pourcentage du chiffre d'affaires encaissé par le PDV).\n\nCe montant est déduit du bénéfice estimé affiché dans ce bilan." },
    ]},
    { slug: 'bilan-metric-cout-ventes', description: "Bilan — coût des ventes", bulles: [
      { title: "Coût des ventes", text: "Estimation du coût d'achat des articles vendus, calculée à partir du prix d'achat unitaire renseigné sur chaque article. Sert à estimer la marge brute. Affiché uniquement si au moins un article a un prix d'achat configuré." },
    ]},
    { slug: 'bilan-metric-droits', description: "Bilan — droits d'auteurs", bulles: [
      { title: "Droits d'auteurs", text: "Total des droits dus aux auteurs pour les ventes de cette session, calculé selon les barèmes de leurs contrats (pourcentage du hors taxe ou du toutes taxes comprises, avec déduction des à-valoirs déjà versés). Ce montant est à reverser aux auteurs concernés." },
    ]},
    { slug: 'bilan-metric-benefice', description: "Bilan — bénéfice estimé", bulles: [
      { title: "Bénéfice estimé hors taxe", text: "Calcul indicatif : chiffre d'affaires hors taxe − coût des ventes − frais de session − commission PDV − droits d'auteurs. Uniquement calculé si les prix d'achat sont renseignés sur les articles. Il ne s'agit pas d'un résultat comptable certifié." },
    ]},

    // ── Réglages ──────────────────────────────────────────────────────────────

    { slug: 'reglages-fiscal', description: 'Réglages / Paramètres fiscaux — mascotte permanente sidebar', bulles: [
      { title: 'TVA : le bon régime dès le départ 🧾', text: 'Ce réglage indique à MeGesti comment traiter fiscalement vos ventes. C\'est l\'un des paramètres les plus importants — mal configuré, vos prix et exports comptables seraient faux.' },
      { text: '🟢 Franchise en base de TVA — si vous êtes micro-entreprise ou auto-entrepreneur sous le seuil légal (~91 900 € de CA annuel), vous n\'avez ni à collecter ni à reverser la TVA. Vos prix HT = prix TTC. MeGesti applique automatiquement la mention légale obligatoire : « TVA non applicable, art. 293 B du CGI ».' },
      { text: '🔵 Assujetti à la TVA — si vous avez dépassé le seuil ou opté pour un statut avec TVA (SARL, SAS…), vous collectez la TVA sur vos ventes et la reversez à l\'administration. MeGesti applique alors les taux configurés par rayon (5,5 % livres, 20 % autres).' },
      { text: '💡 Une fois configuré selon votre statut, vous n\'aurez plus à y toucher — sauf en cas de changement de situation : franchissement du seuil, transformation juridique, ou option volontaire pour la TVA. En dehors de ces cas, oubliez ce réglage, MeGesti s\'en occupe.' },
    ]},

    { slug: 'reglages-rayons-vide', description: 'Réglages / Rayons — sidebar, aucun rayon créé', bulles: [
      { title: 'Comment ça marche ? 🗂️', text: 'Le catalogue est organisé en rayons puis en catégories. Exemple : Librairie → Romans, BD, Jeunesse…' },
      { text: 'Commence par créer ton premier rayon. Les catégories et articles s\'ajouteront ensuite !', cta: { label: 'Créer mon premier rayon', href: '' } },
    ]},

    { slug: 'reglages-rayons-sans-categories', description: 'Réglages / Rayons — sidebar, rayon(s) créé(s) sans catégorie', bulles: [
      { title: 'Super, ton premier rayon ! 🎉', text: 'Clique sur le + dans l\'en-tête du rayon pour y ajouter des catégories. Les catégories permettent de classer tes articles plus finement.' },
      { text: 'Ce rayon vend des livres ? Clique sur l\'icône livre dans l\'en-tête pour activer le mode Librairie — TVA 5,5 % + ISBN + auteurs activés automatiquement.' },
      { text: 'Ajuste la TVA de chaque rayon manuellement en cliquant sur son badge TVA x % dans l\'en-tête.' },
    ]},

    { slug: 'reglages-rayons-pret', description: 'Réglages / Rayons — sidebar, tout configuré (rappel)', bulles: [
      { title: 'Rappel rapide 💡', text: 'Pour ajouter un nouveau rayon, utilise le bouton Nouveau rayon. Clique sur + dans un rayon pour y ajouter des catégories.' },
      { text: 'N\'oublie pas d\'activer le mode Librairie sur tes rayons qui vendent des livres — la TVA et les champs spécifiques se configurent automatiquement.' },
    ]},

    // ── Fiche article ──────────────────────────────────────────────────────────

    { slug: 'article-bnf-declaration', description: 'Fiche article livre — obligation dépôt légal BNF', bulles: [
      { title: 'Le dépôt légal BNF 📚', text: 'Tout éditeur qui publie un livre en France a l\'obligation légale de le déclarer à la Bibliothèque nationale de France (BNF). C\'est le dépôt légal, institué par la loi du 20 juin 1992 (modifiée en 2006).\n\nÀ chaque nouveau titre publié, tu dois déposer 2 exemplaires physiques et remplir la déclaration en ligne sur le portail de la BNF.' },
      { text: 'Le dépôt légal sert à conserver le patrimoine éditorial national, à faire indexer ton livre dans le catalogue BNF (data.bnf.fr), et à officialiser sa publication. C\'est une obligation légale, pas un service optionnel — une omission peut entraîner des sanctions.', cta: { label: 'Portail dépôt légal BNF →', href: 'https://depotlegal.bnf.fr/' } },
    ]},
  ]

  let created = 0
  let skipped = 0
  for (const d of dialogs) {
    const existing = await prisma.mascoteDialog.findUnique({ where: { slug: d.slug } })
    if (!existing) {
      await prisma.mascoteDialog.create({
        data: { slug: d.slug, description: d.description, bulles: d.bulles as any },
      })
      created++
    } else {
      skipped++
    }
  }

  console.log(`✓ Dialogs MeGestine : ${created} créés, ${skipped} déjà présents (intacts)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
