
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

Actuellement : champ URL texte uniquement dans `ArticleForm`.

- Ajouter bouton upload dans `ArticleForm` (en complément de l'URL)
- Endpoint `POST /articles/:id/image` (multipart) côté API
- Redimensionner en thumbnail côté serveur (sharp)
- Stocker sur Scaleway Object Storage (RGPD)
- Limiter taille + fréquence upload (anti-flood)
- L'upload alimente le champ `imageUrl` existant : aucun changement de schéma

---

## Chantier 2 — Visualisation stock avancée

`StockPage` affiche liste + historique en tableau (`HistoriqueMouvements`). Reste :
- Courbe temporelle entrées/sorties par article sur période choisie (sélecteur date)
- Histogramme récapitulatif par rayon sur la même période
- Composant `Sparkline` déjà disponible — voir si suffisant ou intégrer recharts

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
