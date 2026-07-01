# À faire — App mobile (MeGesti)

> Dernière mise à jour : 2026-07-01
> Focus : app mobile React Native + Expo (offline-first, salons/évènements).
> Le web a sa propre roadmap dans `a-faire.md`.

---

## Chantier 0 — Signature APK release (pré-requis Play Store) ⚠️

**Contexte** : un vrai keystore `megesti.keystore` existe + un `credentials.json`, mais le build Gradle l'ignore et signe la release avec `debug.keystore`.

- `apps/mobile/android/app/build.gradle:114-117` : `release { signingConfig signingConfigs.debug }` → à remplacer par un `signingConfigs.release` qui lit `megesti.keystore` (via `credentials.json` pour ne pas commiter les mots de passe en dur).
- Objectif : APK/AAB publiable sur le Play Store.

---

## Chantier 1 — Création de produit (article) depuis l'app

Comme sur le site web : un beau formulaire d'ajout d'article.
- Champs attendus : nom, ISBN, prix vente HT, taux TVA, rayon/catégorie, stock, photo (déjà géré pour l'édition, à réutiliser).
- Endpoints API : `POST /articles` (+ `POST /articles/:id/image` pour la photo).
- À synchroniser avec `useLocalArticles` (pull local après création serveur).

## Chantier 2 — Création de point de vente depuis l'app

Comme sur le site web : un beau formulaire d'ajout de PDV.
- Champs attendus : nom, catégorie de PDV, salon éventuel, encaissement direct, commission fixe/pourcentage.
- Endpoint API : `POST /points-de-vente`.
- À réinjecter dans `useLocalSession.usePointsDeVente()`.

## Chantier 3 — Corriger la sélection du point de vente à l'ouverture de session ⚠️ UX

**Problème** : à l'ouverture d'une session de vente (`caisse.tsx`, modale « ouvrir une session »), on ne peut pas scroller la liste des PDV → galère pour trouver le bon.
- Rendre la liste scrollable (la modale actuelle clip le contenu).
- Envisager un champ de recherche/filtre si la liste est longue.

## Chantier 4 — Adresse API par défaut + reset dans le menu dev

- Définir l'URL par défaut sur `https://api.megesti.com/api` dans `src/constants/Config.ts` (au lieu du fallback `DEV_HOST` local actuel).
- Dans le menu dev caché (`src/components/DevMenu.tsx`, onglet Config) : ajouter un bouton « Réinitialiser l'adresse API » qui remet la valeur par défaut (vider l'override du `devStore`).

## Chantier 5 — Finir l'intégration SumUp

`packages/react-native-sumup` est un stub. À finaliser lors du prochain `expo prebuild` :
1. `com.sumup:merchant-sdk:4.1.0` déjà dans `build.gradle` — vérifier la compat native.
2. `pod 'SumUpSDK'` dans le Podfile iOS.
3. Brancher les vrais appels SDK dans les fichiers `.kt` / `.swift`.
4. Valider le flux `login → checkout` dans `caisse.tsx` + `settings.tsx`.

---

## Fait (mobile)

### 2026-07-01 — Pipeline lecture « serveur d'abord + delta local »
- API : handler P2002 → 409 (`apps/api/src/server.ts`) pour des retries idempotents propres.
- `sync.ts` : 409 traité comme succès (vente/frais déjà sur le serveur).
- Nouveau helper `src/lib/merge.ts` : `mergeVentesByUuid` + `mergeBilanAggregates`.
- Bilan, Dashboard, Sessions, Session-detail : serveur d'abord + delta local fusionné.
- Bugs corrigés : filtre `actif = 1` sur `frais_locaux`, filtre `ANNULEE` dans `useAllSessions`.
