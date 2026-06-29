// ════════════════════════════════════════════════════════════════
// Contenu marketing de la vitrine megesti
// Source : fonctionnalités RÉELLEMENT implémentées (audit code)
// Règle : ne pas annoncer ce qui n'est pas livré (marquer "à venir")
// ════════════════════════════════════════════════════════════════

export const site = {
  name: 'MeGesti',
  domain: 'megesti.fr',
  tagline: "L'atelier de l'éditeur",
  appUrl: 'https://app.megesti.fr',
  apiUrl: 'https://api.megesti.fr',
  adminUrl: 'https://admin.megesti.fr',
  // Disponibilité annoncée
  availability: 'Disponible en août 2026',
  description:
    "MeGesti est l'outil de gestion des maisons d'édition indépendantes : catalogue, ventes en salon, droits d'auteur et conformité fiscale française réunis dans un seul logiciel métier.",
}

export const nav = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Conformité', href: '#conformite' },
  { label: 'Captures', href: '#captures' },
  { label: 'Forfaits', href: '#forfaits' },
  { label: 'FAQ', href: '#faq' },
]

// ─── 8 fonctionnalités phares (basées sur le code réel) ─────────
export const features = [
  {
    icon: 'receipt',
    title: 'Facturation électronique 2026-2027',
    text: "Émettez et recevez vos factures au format UBL / Factur-X via une Plateforme Agréée. Vous êtes prêt pour l'obligation, sans rien ajouter.",
    tone: 'ink',
  },
  {
    icon: 'shield',
    title: 'Caisse conforme anti-fraude TVA',
    text: "Chaîne d'intégrité sécurisée et archivage journalier automatique. Les 4 conditions de la loi de 2018 remplies, sans y penser.",
    tone: 'rose',
  },
  {
    icon: 'feather',
    title: 'Droits d’auteur automatisés',
    text: "Le calcul des royalties se fait seul, selon le contrat, avec recoupement automatique des à-valoir. Fini le déclaratif au doigt mouillé.",
    tone: 'sage',
  },
  {
    icon: 'phone',
    title: 'Application salon hors-ligne',
    text: "Encaissez et scannez les codes-barres sans réseau, en gymnase ou sous chapiteau. La synchronisation se fait au retour, proprement.",
    tone: 'gold',
  },
  {
    icon: 'box',
    title: 'Dépôt-vente & reversements',
    text: "Suivez les livres confiés aux libraires, calculez les commissions et clôturez les sessions de caisse sans tableur.",
    tone: 'mauve',
  },
  {
    icon: 'chart',
    title: 'Bilan de trésorerie',
    text: "Visualisez entrées et sorties, suivez vos charges récurrentes catégorisées au Plan Comptable Général, anticipez les échéances.",
    tone: 'ink',
  },
  {
    icon: 'card',
    title: 'Encaissement par carte',
    text: "Acceptez le paiement CB directement depuis le mobile du salon. Sans ressaisie, sans erreur.",
    tone: 'rose',
    status: 'en cours',
  },
  {
    icon: 'flag',
    title: 'Hébergé en France',
    text: "Données isolées par client, hébergement européen souverain et conforme RGPD. Vos données restent chez vous.",
    tone: 'sage',
  },
]

// ─── Conformité différenciante ──────────────────────────────────
export const compliance = {
  title: "En règle sans y penser",
  intro:
    "Deux obligations fiscales françaises majeures, souvent source d'angoisse pour les éditeurs. MeGesti les intègre dans le flux naturel de votre activité.",
  items: [
    {
      law: 'Loi anti-fraude TVA — 2018',
      detail:
        "Tout logiciel qui enregistre des ventes au comptant doit garantir l'inaltérabilité, la sécurisation, la conservation et l'archivage. MeGesti tient une chaîne d'intégrité cryptographique et archive automatiquement chaque jour.",
      risk: "7 500 € d'amende par logiciel non conforme",
    },
    {
      law: 'Facturation électronique — 2026-2027',
      detail:
        "L'émission et la réception des factures B2B deviennent obligatoirement dématérialisées. MeGesti parle nativement le langage des Plateformes Agréées et archive vos flux pour 10 ans.",
      risk: "Obligation progressive selon la taille de l'entreprise",
    },
  ],
}

// ─── Persona / pour qui ─────────────────────────────────────────
export const personas = {
  title: "Pensé pour les éditeurs indépendants",
  intro:
    "MeGesti ne s'adresse pas à tout le monde. Il s'adresse à celles et ceux qui vivent le livre au quotidien.",
  items: [
    {
      title: 'Maisons d’édition indépendantes',
      text: "De 1 à 10 personnes. Vous gérez un catalogue, des auteurs, des stocks et une comptabilité qui vous échappent dans Excel.",
    },
    {
      title: 'Éditeurs sur salon',
      text: "Présents en dédicaces, festivals et foires. Vous avez besoin d'encaisser vite, même sans réseau, et de tout réconcilier le soir.",
    },
    {
      title: 'Éditeurs francophones',
      text: "Depuis Paris, Bruxelles, Montréal ou Genève. L'interface, les obligations fiscales et les formats légaux sont pensés dès l'origine pour le monde du livre francophone.",
    },
  ],
}

// ─── FAQ ────────────────────────────────────────────────────────
export const faq = [
  {
    q: 'MeGesti est-il disponible immédiatement ?',
    a: "La version alpha ouvre en août 2026. Vous pouvez dès maintenant demander un accès : nous accompagnons les premiers éditeurs pas à pas.",
  },
  {
    q: 'Mes données sont-elles vraiment en France ?',
    a: "Oui. MeGesti est hébergé sur un serveur européen souverain. Chaque maison d'édition dispose d'un espace isolé ; vos données ne sont jamais partagées.",
  },
  {
    q: 'Que se passe-t-il si le réseau coupe en salon ?',
    a: "L'application mobile salon fonctionne entièrement hors-ligne : encaissement, scan de codes-barres, sessions de caisse. Tout se synchronise proprement au retour du réseau, sans risque de doublon.",
  },
  {
    q: 'MeGesti gère-t-il la conformité fiscale ?',
    a: "Oui, et c'est un point fort. La chaîne d'intégrité et l'archivage journalier répondent à la loi anti-fraude TVA de 2018. La facturation électronique 2026-2027 est intégrée via une Plateforme Agréée.",
  },
  {
    q: 'Faut-il être à l’aise avec l’informatique ?',
    a: "Non. MeGesti est conçu pour des éditeurs, pas pour des informaticiens. L'interface est épurée et la mascotte MeGestine guide pas à pas dans l'application.",
  },
]

// ─── Forfaits (données fixes ; prix récupérés dynamiquement depuis l'admin) ──
export const plans = [
  {
    code: 'AUTO_EDITION',
    name: 'Auto-édition',
    pitch: "Pour l'auteur qui s'auto-édite",
    highlight: false,
    includes: [
      'Catalogue jusqu’à 20 articles',
      '1 utilisateur',
      'Facturation électronique (5 factures/mois)',
      'Réception illimitée de factures',
    ],
  },
  {
    code: 'EDITION',
    name: 'Édition',
    pitch: 'Le cœur de métier de l’éditeur',
    highlight: true,
    includes: [
      'Catalogue jusqu’à 40 articles',
      '3 utilisateurs',
      'Droits d’auteur & contrats',
      'Dépôt-vente & reversements',
      'Facturation électronique (50 factures/mois)',
      'Bilan de trésorerie & charges',
    ],
  },
  {
    code: 'EDITION_PRO',
    name: 'Édition Pro',
    pitch: 'Pour les structures établies',
    highlight: false,
    includes: [
      'Catalogue illimité',
      '10 utilisateurs',
      'Toutes les fonctionnalités Édition',
      'Facturation électronique (500 factures/mois)',
      'Accompagnement prioritaire',
    ],
  },
]

// ─── À venir (roadmap, affichée honnêtement) ────────────────────
export const roadmap = [
  'Boutique auteur (paiement direct)',
  'Export comptable (FEC, Pennylane, Tiime)',
]
