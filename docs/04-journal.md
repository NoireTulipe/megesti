# 04 — Journal des décisions

> Décisions horodatées au fil de l'eau. À tenir court et factuel.
> Objectif : dans 6 mois, comprendre *pourquoi* on a choisi *ça*, pas autre chose.
> Format : date, contexte bref, décision, alternatives rejetées (une ligne chacune).

---

## 2026-04

### 2026-04-23 — Stack technique globale

**Contexte** : choix de la stack pour industrialisation multi-tenant.
**Décision** : Node.js + TypeScript (back), React + TS + Vite (web), React Native + Expo (mobile), PostgreSQL + Prisma, pnpm workspaces.
**Alternatives rejetées** :
- PHP / jQuery / vanilla : zone de confort, mais inadapté à la complexité du projet.
- Symfony : pas de gain unification JS/TS front/back.
- Laravel + Inertia : compromis inutile.
- Capacitor (mobile) : perfs et fiabilité insuffisantes pour salon.
- Kotlin + Swift natifs : double effort, non tenable en solo.

### 2026-04-23 — Outil Claude en phase de construction

**Contexte** : choix entre extension VSCode et Claude Code CLI.
**Décision** : extension Claude Code dans VSCode pour toute la phase d'apprentissage et de construction v1.
**Motif** : feedback visuel des diffs adapté à la montée en compétence, discipline tokens plus facile, moins de consommation "sauvage" qu'en CLI.
**Bascule CLI envisagée** : courant 2027 pour automatismes bien cadrés (scripts, déploiements, tâches répétitives).

### 2026-04-23 — Import ventes KDP et autres plateformes auteur

**Contexte** : hésitation sur l'automatisation de la récupération des rapports KDP.
**Décision** : import manuel du XLSX via drag & drop + parser SheetJS multi-feuilles. Pas d'automatisation.
**Alternatives rejetées** :
- API KDP : n'existe pas, n'existera pas.
- Scraping serveur : violation CGU Amazon, MFA, fragilité, responsabilité juridique.
- Extension navigateur : second produit à maintenir, friction utilisateur quasi équivalente à l'import manuel.
- Lecture depuis popup : Same-Origin Policy infranchissable (protection fondamentale du web).
**UX prévue** : bouton ouvrant la bonne page KDP en nouvel onglet + modale d'import drag & drop au retour.

### 2026-04-23 — Internationalisation (i18n) obligatoire dès v1

**Contexte** : le produit cible la France en priorité, mais la francophonie (Belgique, Suisse, Québec) est dans la roadmap. Décision prise en amont pour éviter un retrofit coûteux.
**Décision** : tout champ texte visible utilisateur (labels UI, catégories, messages, contenus métier) doit supporter a minima `fr` et `en` dès la conception du modèle de données et des composants.
**Approche retenue** : JSONB par champ pour les contenus métier (`{ fr: string, en?: string }`), bibliothèque i18n dédiée (ex. `i18next`) pour les libellés UI. Type partagé `LocalizedString` dans `packages/shared`.
**Alternatives rejetées** :
- Colonne séparée par langue (`titre_fr`, `titre_en`) : explosion du schéma, migrations pénibles.
- Table `translations` centralisée : overhead d'architecture disproportionné à ce stade.
- Reporter après lancement : retrofit sur un ORM Prisma + UI existante = deux fois le travail.
**À réévaluer si** : besoin d'une 3e langue avant 2028 (arabe, espagnol) — à ce stade, réévaluer la structure JSONB vs table dédiée.

### 2026-04-23 — Scan codes-barres ISBN/EAN en v1

**Contexte** : feature évidente non identifiée au brainstorming initial, émergée pendant la session stack.
**Décision** : intégration v1 sur app mobile (expo-camera) + app web (BarcodeDetector API + fallback ZXing-js) + support douchette HID USB/Bluetooth.
**Effort estimé** : 1-2 semaines.
**Abstraction** : interface `BookMetadataProvider` pour basculer entre BnF, Electre, Google Books, Open Library sans refonte.

---

---

## 2026-05

### 2026-05 — Architecture multi-tenant implémentée

**Contexte** : premier sprint d'industrialisation du monorepo.
**Décision** : isolation par `tenantId` sur toutes les tables Prisma + middleware `tenant.ts` qui injecte le tenant depuis le JWT. RLS PostgreSQL non activé (complexité migrations), réévaluer à 500+ clients.
**Alternatives rejetées** : schéma-par-tenant (coût hébergement, migrations complexes).

### 2026-05 — Plan gating centralisé

**Contexte** : besoin de limiter les fonctionnalités par plan d'abonnement.
**Décision** : fichier `packages/shared/src/planFeatures.ts` comme source de vérité unique (backend + frontend). Hook `usePlanFeatures()` + composant `<FeatureGate feature="...">` côté web. Middleware `requirePlanFeature()` côté API.
**Plans** : `TRIAL | AUTO_EDITION | EDITION | EDITION_PRO`. TRIAL = Edition complet 30 jours, bascule AUTO_EDITION sans abonnement.

### 2026-05 — Auteur virtuel (plan Auto-édition)

**Contexte** : plan Auto-édition ne permet pas la gestion complète des auteurs tiers, mais l'éditeur est souvent lui-même auteur.
**Décision** : création lazy d'un `Auteur` avec `isVirtuel: true` à la création du premier article en AUTO_EDITION. Assigné automatiquement. Lecture seule dans la section Auteurs avec mention "Votre profil auteur".

### 2026-05 — Référence unique paiement DA

**Contexte** : besoin d'une référence traçable et non éditable par paiement de droits d'auteur.
**Décision** : format `INITIALES-LIVRE4-ANNEE-ORDRE` (ex: `FB-KAZU-2026-001`). Implémenté dans `packages/business/src/droits/reference.ts`. Non modifiable après création.

### 2026-05 — Conformité caisse (loi anti-fraude TVA 2018)

**Contexte** : l'app enregistre des ventes au comptant → logiciel de caisse soumis aux 4 conditions légales.
**Décision** : chaîne de hachage cumulatif sur les ventes (`previousHash` + `hash` sur `Vente`), archivage journalier automatique (`ArchiveJournaliere` + job BullMQ `archive-journaliere`), conservation 6 ans par design.
**Implémentation** : `packages/business/src/till/integrity.ts` + tests unitaires.

### 2026-05 — Route /comptabilite → /statistiques_de_vente

**Contexte** : le terme "comptabilité" induisait en erreur — ce n'est pas un module comptable, c'est un tableau de bord des ventes.
**Décision** : renommer la route en `/statistiques_de_vente`. Redirect legacy `/comptabilite` conservé dans `App.tsx` pour compatibilité liens existants.

### 2026-05 — CMS mascotte + popups

**Contexte** : besoin d'afficher des messages contextuels et d'onboarding sans redéployer le front.
**Décision** : modèles `MascoteDialog` et `Popup` en base, gérés via admin. Système de `PopupVu` par user pour gérer les modes SHOW_ONCE / DISMISSIBLE / ALWAYS.

### 2026-05 — Champs personnalisés par entité et par rayon

**Contexte** : chaque maison d'édition a des besoins différents (champs métier spécifiques).
**Décision** : `CustomFieldDefinition` scopé soit à un `EntityType` (auteur, salon, dépôt…) soit à un `Rayon` (champs propres aux livres, goodies…). Valeurs stockées dans `CustomFieldValue`. Builder drag & drop côté réglages.

### 2026-05 — Charges avec catégories PCG

**Contexte** : besoin de suivi des charges pour le bilan et l'export comptable futur.
**Décision** : module `Charge` avec `CategorieCharge` alignée sur le Plan Comptable Général (60x, 61x-62x, 63x, 65x, 67x). Support abonnements récurrents avec `prochaineEcheance`.

---

## Template pour les prochaines entrées

```
### AAAA-MM-JJ — Titre court de la décision

**Contexte** : pourquoi la question s'est posée.
**Décision** : ce qui a été tranché.
**Alternatives rejetées** : ce qu'on a écarté et en une ligne pourquoi.
**À réévaluer si** : condition qui justifierait de reprendre la décision.
```
