
# À faire — megesti

> Dernière mise à jour : 2026-05-16
> Focus : partie WEB du SaaS (mobile dans un doc dédié).

---

## Chantier 0 — Corrections bugs actifs

### 0.1 Droits auteur : prochainVersement figé sur le retard
**Comportement attendu** : si un versement est en retard, `prochainVersement` doit rester à la date originale jusqu'au paiement effectif (statut `PAYE`). Actuellement, créer un paiement en `PREVU` avance déjà la date.
- `apps/api/src/routes/droits-auteur.ts` : déplacer la mise à jour de `prochainVersement` dans le PATCH qui passe en `PAYE`, pas dans le POST de création.
- Afficher le montant en retard avec la date d'échéance originale côté UI. **=> FAIT, à tester en pré-prod.**

### 0.2 Reversement bloqué plan Auto-éditeur
En plan Auto-édition, quand une vente est enregistrée en caisse (session ouverte), le reversement de la session est créé mais le module Reversements est gated → l'éditeur ne peut pas encaisser. Décision à prendre : ouvrir le suivi des reversements pour toutes les sessions quel que soit le plan, ou adapter la règle métier. **FAIT, à tester en pré-prod.**

### 0.3 Bug catalogue : images prises depuis l'app mobile
Les images uploadées via l'app ne s'affichent pas correctement dans le catalogue web. À reproduire + corriger (URL de l'image ? CORS ? chemin relatif ?). **FAIT => normalement c'est réglé à vérifier.**

### 0.4 Dette technique : noImplicitAny
`noImplicitAny: false` est un fix pragmatique actuel. À remettre à `true` et corriger les callbacks implicites restants dans les routes et composants. Pas urgent, mais avant toute commercialisation.

---

## Chantier 1 — Upload image dans les articles

FAIT - Validé

---

## Chantier 2 — Visualisation stock avancée

FAIT - Validé

---

## Chantier 2 bis (on a oublié et c'est pourtant la clé de la réussite) - Le service Réception/Emission de facture électronique

Plan Auto-Editeur : réception illimité - 5 factures par mois + accès à l'achat de facturier
Plan Editeur : réception illimité - 50 factures par mois + accès à l'achat de facturier
Plan Editeur Pro : réception illimité - 500 factures par mois + accès à l'achat de facturier

On passera par https://www.superpdp.tech (0,0025 €/transaction — superpdp facture François, qui revend des crédits aux tenants via Stripe).

Pour le test en mode bac à sable : `ngrok http 3001` → URL HTTPS pour les webhooks superpdp en local.

Voir si on ne peut pas mutualiser le code pour un SaaS de facturier. A réfléchir pour plus tard.

---

### Plan de route

#### Prérequis — avant toute ligne de code
- [x] Lire la doc API superpdp : OAuth2 client_credentials, `POST /v1.beta/invoices`, polling `GET /v1.beta/invoices`, `POST /v1.beta/invoice_events`
- [ ] Credentials sandbox superpdp.tech (client_id + client_secret)
- [ ] Tester le script `quick_start.js` pour valider l'accès sandbox
- [ ] Packs Stripe calibrés et STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET en .env
- [ ] ngrok lancé pour les tests webhook en local : `ngrok http 3001`

---

#### Phase 1 — Fondations ✅ FAIT

**Schéma Prisma — 3 ajouts**
- `FactureEmission` : id, tenantId, numero, statut (BROUILLON/ENVOYEE/ACCEPTEE/REFUSEE/ANNULEE), destinataireSiret, destinataireNom, montantHT/TVA/TTC, format, pdpId (retourné par superpdp), dateEmission
- `FactureReception` : id, tenantId, emetteurSiret, emetteurNom, montantTTC, dateReception, pdpId, lienTelechargement
- Champ `facturesCredit Int @default(0)` sur `Tenant` (crédits supplémentaires achetés)

**Abstraction `InvoiceTransmissionService`** *(déjà planifiée dans les décisions techniques)*
```typescript
// packages/shared/src/services/InvoiceTransmissionService.ts
interface InvoiceTransmissionService {
  emettre(payload: FacturePayload): Promise<{ pdpId: string; statut: string }>
  getStatut(pdpId: string): Promise<string>
}
// Implémentation : apps/api/src/services/SuperPdpService.ts
```

**Endpoint webhook réception**
`POST /api/pdp/webhook` → valide la signature superpdp → crée `FactureReception` → déclenche notification (BullMQ job)

**Middleware quota**
`checkFactureQuota(tenantId)` : `COUNT(FactureEmission mois courant)` comparé à `planFeatures.facturesEmissionMois + tenant.facturesCredit` → 402 si dépassé

---

#### Phase 2 — Émission ✅ FAIT (UBL généré, route POST /facturation/emissions, quota check)

- Génération du format attendu par superpdp (Factur-X ou autre — à confirmer avec la doc)
- Appel `SuperPdpService.emettre()` → stockage en base → suivi statut via webhook ou polling
- Décrémentation `facturesCredit` si quota plan dépassé

---

#### Phase 3 — Rechargement de crédits ✅ FAIT (QuotaDepaseModal + Stripe Checkout + webhook)

**Modale "Oups, plus de crédits"** — déclenchée avant toute émission si quota = 0 :
- Magestine (slug CMS `facturation-quota-epuise`) : *"Notre facturier est vide ! Vous avez utilisé vos N factures du mois. Rechargez en un clic pour continuer."*
- Bouton CTA avec le prix : *"Recharger — 10 crédits pour X €"*
- Stripe Checkout one-time → webhook `checkout.session.completed` → incrémente `facturesCredit`
- Rechargement immédiat

---

#### Phase 4 — Interface web ✅ FAIT (FacturationPage + PdpConfigSection dans Réglages + badge sidebar)

- Route `/facturation` (gated Edition+)
- Onglet **Émissions** : liste, statuts PDP en temps réel, téléchargement Factur-X, bouton "Nouvelle facture"
- Onglet **Réceptions** : liste, téléchargement
- Formulaire d'émission : SIRET destinataire, lignes, TVA auto, numérotation automatique conforme
- Badge discret dans la sidebar/header : *"N factures restantes"* → *"0 — Recharger"* en rouge si vide

---

#### Phase 5 — Mobile ⏳ À FAIRE

- Notification in-app quand facture reçue (via BullMQ job → push ou badge)
- *(Compagnon v2)* View facture dans l'app mobile

---

#### Note SaaS de facturier
`InvoiceTransmissionService` proprement abstrait + modèles `FactureEmission/Réception` isolés = noyau d'un micro-SaaS de facturation B2B extractible sans dette technique. Respecter l'architecture dès v1.

---
## Chantier 3 — Plan gating : compléter

Architecture en place (`planFeatures.ts`, `FeatureGate`, middleware tenant). Reste :

### 3.1 handlePlanDowngrade()
Fonction backend déclenchée lors d'un changement de plan vers le bas :
- Articles au-delà du quota → statut `archivé` (inactifs en caisse)
- Bandeau UI : *"X articles archivés suite au changement de plan. Choisissez lesquels réactiver ou upgradez."*
- Contrats et droits d'auteur → lecture seule jusqu'à upgrade
- Utilisateurs surnuméraires → accès suspendu (jamais supprimés)

### 3.2 Reconversion article en plan Auto-édition
Quand un article est archivé par downgrade, bouton *"Je suis l'auteur de ce livre"* → assigne l'auteur virtuel → réactive dans le quota.

---

## Chantier 4 — Éditeur de contrat en ligne

`ContratsAuteurSection` existe (création basique + lecture). Reste :
- Formulaire d'édition inline des clauses (taux DA, à-valoir, périodicité, dates d'effet)
- Pas de génération PDF en v1 — affichage structuré suffit

---

## Chantier 5 — Intégration SumUp (app mobile)

`packages/react-native-sumup` est un stub. À faire lors du prochain `expo prebuild` :
1. `com.sumup:merchant-sdk:3.5.+` dans `build.gradle` Android
2. `pod 'SumUpSDK'` dans `Podfile` iOS
3. Brancher les vrais appels SDK dans les fichiers `.kt` / `.swift`

---

## Différé — ne pas commencer avant signal explicite

### Chantier B — Réseau cross-tenant (Edition Pro uniquement)
> Bloquer jusqu'à ce qu'Edition Pro soit en prod avec une base clients établie.

Auteur sur son propre compte peut vendre des articles d'une ME tierce qui lui en assigne.
- Nouveau modèle `CrossTenantAssignment`
- Vente cross-tenant : CA → tenant ME, DA → tenant auteur
- Bilan auteur : agréger son propre CA + DA inter-tenants
- Isolation multi-tenant à étendre pour lectures croisées contrôlées

### Migration URL : `/t/:slug` → `slug.megesti.com`
> Quand le domaine `megesti.com` sera disponible.

1. DNS wildcard `*.megesti.com`
2. SSL wildcard Let's Encrypt + challenge DNS (Cloudflare)
3. Caddy : directive `*.megesti.com` avec extraction sous-domaine
4. Web app : lire `window.location.hostname.split('.')[0]` au lieu de `params.slug`
5. Backend : aucun changement (login accepte déjà le slug)
Non-destructif : `/t/:slug` peut coexister pendant la transition.

---

## Idées futures — mémo

- **Plateforme soumissions auteurs** : annonces de recrutement (auteurs, illustrateurs) publiées par les ME depuis leur back-office
- **Vitrine salons/évènements** : site vitrine megesti.com intégrant les salons, importables par les ME dans leur réseau
