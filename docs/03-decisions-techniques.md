# 03 — Décisions techniques

> Consolidation des décisions techniques tranchées lors des sessions de cadrage.
> À relire avant tout changement de stack ou d'architecture.

---

## 1. Stack validée (avril 2026)

### Backend

| Composant | Choix | Motif |
|---|---|---|
| Runtime | Node.js (LTS) | Un seul langage front/back, écosystème mature |
| Langage | TypeScript strict | Sécurité, autocomplétion, refactor safe |
| Framework HTTP | Fastify | Performant, schéma-driven, plus léger que NestJS |
| ORM | Prisma | Excellente DX, migrations propres, auditables à la revente |
| Base de données | PostgreSQL | Row-level security pour multi-tenant, robustesse, JSONB |
| Queue / cron | BullMQ (sur Redis) | Idempotence, retry, observabilité |

**Alternative NestJS** : envisageable si besoin de structure forte plus tard. Pas en v1 (overhead inutile pour solo).

### Frontend web (application éditeur + site admin)

| Composant | Choix | Motif |
|---|---|---|
| Framework | React + TypeScript | Écosystème, compétence partagée avec mobile |
| Build | Vite | Rapide, moderne, remplaçant de Create React App |
| PWA | Workbox | Service Worker, cache offline, installation bureau |
| Styles | Tailwind CSS | Productivité, cohérence, DX |
| Composants | shadcn/ui | Copiables dans le projet, pas de dépendance dure |
| State | React Query (serveur) + Zustand (UI) | Cache serveur auto, store simple UI |
| Forms | React Hook Form + Zod | Performant, validation typée partagée back/front |

### Mobile (application salon + app auteur)

| Composant | Choix | Motif |
|---|---|---|
| Framework | React Native + Expo | Code partagé avec web, iOS + Android, dev sur Windows |
| Base locale | expo-sqlite | Fiable, natif, volume illimité contrairement à IndexedDB |
| Scan codes-barres | expo-camera + expo-barcode-scanner | Support EAN-13, ISBN, QR |
| Build cloud | EAS Build | Compile iOS sans Mac local |
| Publication iOS | Mac requis (MacinCloud ou Mac mini d'occasion) | Contrainte Apple non contournable |

### Monorepo

| Composant | Choix | Motif |
|---|---|---|
| Gestionnaire | pnpm workspaces | Rapide, efficace, standard 2026 |
| Orchestrateur | Turborepo (optionnel) | Cache builds, parallelisation (si monorepo grossit) |

Structure cible :

```
mon-saas/
├── apps/
│   ├── api/           # Backend Fastify
│   ├── web/           # Frontend React Vite
│   ├── mobile/        # React Native Expo
│   └── admin/         # Back-office interne (à créer plus tard)
├── packages/
│   ├── shared/        # Types, schémas Zod, constantes métier
│   ├── business/      # Logique métier (calcul droits, permissions)
│   └── config/        # ESLint, TS config partagés
├── docs/
├── CLAUDE.md
└── package.json
```

---

## 2. Choix écartés et pourquoi

### Stacks backend écartées

- **PHP + jQuery + Ajax vanilla** : zone de confort historique de l'utilisateur. Écarté car synchro offline complexe, état applicatif lourd, PWA et intégrations multiples rendraient le projet ingérable à 6 mois.
- **Symfony** : tentation de revenir dans du PHP moderne. Écarté pour même raison : n'apporte pas l'unification front/back JS/TS qui fait gagner le plus de temps en solo.
- **Laravel + Inertia + React** : compromis honnête si React faisait peur. Non retenu : l'utilisateur accepte l'apprentissage React complet.

### Stacks mobile écartées

- **Capacitor (ex-choix de l'utilisateur)** : webview enveloppée. Perfs dégradées pour salon, IndexedDB instable sur iOS, hardware via plugins fragiles. Abandonné.
- **Kotlin natif + Swift natif** : doublerait l'effort, aucun partage avec web. Inviable en solo.

### Architecture écartée

- **Application desktop packagée (Electron, Tauri)** : double surface de maintenance. Remplacée par PWA installable (Add to Home Screen).

---

## 3. Architectures spécifiques à garder en tête

### Multi-tenant

**Approche recommandée** : row-level security PostgreSQL + colonne `tenant_id` sur toutes les tables métier + middleware qui injecte le tenant courant depuis le JWT de session.

Alternative schéma-par-tenant : écartée au démarrage (complexité migrations, coût hébergement par client). Réévaluer au-delà de 500 clients.

### Synchronisation offline (app salon)

Pattern à appliquer strictement (voir §3.2 du brainstorming pour détails) :

- UUID v4 généré **côté client** au moment de l'action
- File d'attente persistante dans SQLite local
- API serveur idempotente : accepte l'UUID client, retourne succès silencieux si déjà présent
- Double horodatage : `created_at` (appareil, foi fiscale) + `synced_at` (serveur)
- Badge visuel permanent d'état de synchro
- Retry exponentiel, pas de résolution automatique de conflit (alerte humaine)

### Abstractions obligatoires (éviter dépendance dure)

Trois interfaces à créer dès le début :

1. **`InvoiceTransmissionService`** : abstraction Plateforme Agréée (facturation électronique)
2. **`BookMetadataProvider`** : abstraction fournisseur bibliographique (BnF, Electre, Google Books, Open Library)
3. **`PaymentTerminalProvider`** : abstraction encaissement salon (SumUp, Zettle, Stripe Reader)

Chaque interface expose des méthodes génériques (`submit`, `fetch`, `charge`…). Implémentations concrètes branchées derrière. Changement de prestataire = nouveau module, pas refonte.

### Conformité caisse (loi anti-fraude TVA 2018)

Quatre conditions techniques à implémenter :

1. **Inaltérabilité** : aucune modification a posteriori d'une vente. Correction = contre-écriture (annulation + nouvelle écriture).
2. **Sécurisation** : journal d'événements inaltérable + chaîne d'intégrité (hash cumulatif entre lignes).
3. **Conservation** : 6 ans minimum, accessible sur demande.
4. **Archivage** : clôtures journalières / mensuelles / annuelles automatisées.

**Zone de jeu technique** de l'utilisateur : implémentation crypto propre (hash chain, signatures), audit de l'existant, tests d'intégrité. À investir avec plaisir, c'est légitime ici.

### Internationalisation (i18n)

Le produit est conçu pour la France en v1 mais doit être extensible à la francophonie sans refonte.

**Libellés UI** : bibliothèque `i18next` (+ `react-i18next` côté web, `i18next` natif côté mobile). Fichiers de traduction dans `packages/shared/locales/{fr,en}.json`.

**Contenus métier** (champs saisis par l'utilisateur dans la base) : type partagé `LocalizedString` dans `packages/shared` :

```typescript
// packages/shared/src/types/i18n.ts
export type Locale = 'fr' | 'en'
export type LocalizedString = { fr: string; en?: string }
```

Stockage en colonne JSONB Prisma :

```prisma
// Exemple sur un champ catégorie
model Categorie {
  id    String @id @default(uuid())
  label Json   // LocalizedString : { fr: "Jeunesse", en: "Children" }
}
```

**Règle** : `en` est toujours optionnel en v1 (fallback sur `fr` si absent). L'interface d'admin permet de renseigner les deux langues. Jamais de colonne `_fr` / `_en` séparée.

### Parseur XLSX multi-plateformes (offre Auteur)

Pour import KDP / Kobo / Bookelis / BoD / Librinova :

- Librairie : **SheetJS** (`xlsx`) — gratuite, mature
- Parcours multi-feuilles avec détection automatique du format source
- Déduplication par hash des lignes (royalty_date + marketplace + asin/isbn + montant)
- Normalisation devises vers EUR (taux de change BCE ou fixe au jour d'import)
- Preview avant insertion : "X ventes détectées, Y € de royalties"
- Asset durable du produit, pas corvée. À soigner.

---

## 4. Environnement et outillage

### Poste de développement

- **OS** : Windows 11
- **WSL2** : recommandé (évite galères chemins/fins de ligne/permissions npm)
- **Éditeur** : VSCode
- **Assistant IA** : extension Claude Code (pas CLI pour l'instant)
- **Node.js** : version LTS via nvm-windows ou équivalent
- **pnpm** : installé globalement

### Pré-production

- **Serveur Ubuntu personnel** à domicile pour tests pré-prod
- Reproduire l'environnement cible (Clever Cloud / Scaleway tournent sous Linux)

### Publication mobile

- **Android** : dev et publication possibles depuis Windows, pas d'obstacle
- **iOS** : Mac requis pour la publication finale. Options :
  - Développement : Expo Go sur iPhone physique (pas de Mac)
  - Build : EAS Build cloud (Expo, ~30 $/mois)
  - Publication : MacinCloud (~25 €/mois) ou Mac mini M4 d'occasion (~500-600 €)
- **Apple Developer Program** : 99 $/an obligatoire

---

## 5. Conventions de code

### Nommage

- **Technique** : anglais (`userController`, `invoiceService`, `paymentMiddleware`)
- **Métier** : français (`livre`, `auteur`, `maisonEdition`, `depotLibraire`, `droitsAuteur`, `prixPublic`)
- **Fichiers** : `kebab-case.ts`
- **Composants React** : `PascalCase.tsx`

### TypeScript

- `strict: true` obligatoire
- Pas de `any` sans justification commentée
- Types partagés back/web/mobile via package `shared`
- Schémas Zod pour validation d'entrée, types dérivés via `z.infer`

### Tests

- Tests unitaires sur la logique métier (priorité) : calcul droits d'auteur, prix unique, permissions ME/auteur, chaîne d'intégrité caisse
- Pas de couverture 100 % obsessionnelle. Couvrir ce qui casserait gravement en prod.
- Framework : Vitest (rapide, compatible Vite, ergonomie Jest)

### Git

- **Conventional Commits** : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branches : `main` (prod), `dev` (intégration), `feat/xxx`, `fix/xxx`
- Pas de commit direct sur `main` une fois en prod

---

## 5bis. État d'implémentation (mai 2026)

| Domaine | Statut |
|---|---|
| Monorepo pnpm + packages shared/business | ✅ En place |
| Backend Fastify + Prisma + PostgreSQL | ✅ En place |
| Multi-tenant (tenantId + middleware) | ✅ En place (RLS PG non activé) |
| Frontend React + Vite + Tailwind + shadcn/ui | ✅ En place |
| React Query + Zustand | ✅ En place |
| React Hook Form + Zod | ✅ En place |
| Plan gating (planFeatures.ts + FeatureGate) | ✅ En place |
| Conformité caisse (hash chain + archivage) | ✅ En place |
| Droits d'auteur (calcul, références, retards) | ✅ En place |
| Champs personnalisés (FormBuilder) | ✅ En place |
| Admin panel (tenants, mascotte, popups) | ✅ En place |
| App mobile React Native + Expo | ✅ En place (Android) |
| BullMQ + Redis (jobs) | ✅ En place |
| Stripe (abonnements SaaS) | ⏳ Schéma prêt, intégration à faire |
| Upload image / Object Storage | ⏳ À faire |
| SumUp SDK natif | ⏳ Stub uniquement |
| Facturation électronique (PDP) | ⏳ Abstraction définie, intégration à faire |
| Export comptable (FEC, Pennylane) | ⏳ À faire |
| Tests d'intégration API | ⏳ À faire |
| Monitoring (Sentry, Better Uptime) | ⏳ À faire |

---

## 6. Outillage tiers à prévoir

### Avant le premier client payant

- **Monitoring uptime** : Better Uptime (gratuit <10 monitors)
- **Error tracking** : Sentry (plan gratuit au départ)
- **Alertes critiques** : bot Telegram ou Slack (pas email seul)
- **Page statut publique** : `status.nomdusaas.fr`
- **Sauvegardes** : incluses dans hébergement + test de restauration trimestriel
- **Chiffrement sauvegardes** : obligatoire RGPD

### Services critiques externes

- **Stripe** : abonnements SaaS
- **Plateforme Agréée** : à sélectionner (étude avril-juin 2026, cf. cadrage §7.1)
- **SumUp API** : intégration v1
- **Service emailing transactionnel** : Postmark, Resend, ou Brevo
- **Stockage objets** : Scaleway Object Storage ou OVH (RGPD)

---

## 7. Points d'attention transversaux

### Pour la revente future (cible ~1 M€)

Décisions techniques qui impactent la valorisation :

- Code propre et documenté dès le départ
- Dette technique minimale (tech debt = décote à l'audit)
- Tests sérieux sur la logique métier
- Architecture claire, monorepo lisible
- Propriété intellectuelle sans ambiguïté (document signé avec maison d'édition épouse)
- Comptabilité impeccable (SASU + expert-comptable)

### Pour l'apprentissage de la stack

- Chaque choix technique doit être **compris**, pas subi
- L'utilisateur pose les questions quand il veut creuser
- Claude explique brièvement par défaut, en profondeur à la demande
- Pas de sur-abstraction "au cas où" : YAGNI (You Aren't Gonna Need It)

---

*Document vivant. Mettre à jour à chaque décision technique structurante.*
*Dernière mise à jour : avril 2026.*
