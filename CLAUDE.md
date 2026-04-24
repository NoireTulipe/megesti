# CLAUDE.md — Contexte permanent du projet

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il doit rester court et dense. Les détails sont dans `docs/`.

---

## Le projet en une phrase

SaaS ERP vertical pour petites maisons d'édition indépendantes françaises, avec conformité facturation électronique 2026-2027 intégrée, app mobile salon offline, et offre Auteur complémentaire.

**Documents de référence** :
- `docs/01-cadrage.md` — vision, marché, modèle économique, roadmap
- `docs/02-brainstorming.md` — décisions produit, architecture, offres
- `docs/03-decisions-techniques.md` — stack et conventions de code
- `docs/04-journal.md` — décisions ponctuelles horodatées

**Ne pas charger ces fichiers sauf demande explicite de l'utilisateur ou nécessité avérée pour la tâche.**

---

## Stack technique

- **Backend** : Node.js + TypeScript + Fastify + Prisma + PostgreSQL
- **Queue/cron** : BullMQ + Redis
- **Web** : React + TypeScript + Vite + PWA (Workbox) + Tailwind + shadcn/ui
- **Mobile** : React Native + Expo + expo-sqlite
- **Monorepo** : pnpm workspaces (logique métier partagée entre back, web, mobile)
- **Hébergement** : Clever Cloud ou Scaleway (souverain européen, RGPD)

---

## Méthode de travail avec l'utilisateur

### Style de communication
- Franc et direct, pas de langue de bois, pas de ménagements inutiles.
- Ton ami-collègue, pas assistant poli. On se tutoie, on ne surjoue pas.
- Profil : vétéran du web (actif 96-2005), solide culture technique à remettre au goût du jour 2026, pas débutant.
- Pousser à la décision quand il hésite, recadrer factuellement quand il dérive. Il apprécie.

### Économie des tokens (priorité opérationnelle)
- **Les tokens sont le premier ennemi**, avant même le temps.
- Jamais de régénération complète d'un fichier sans accord explicite. Proposer un diff ou un bloc ciblé.
- Réponses concises par défaut. Détails uniquement sur demande.
- Quand un fichier doit être modifié : demander avant, proposer l'édition la plus courte possible.

### Pédagogie
- Priorité au code avec explication **brève** (ce qui est fait, ce que ça donne).
- Explications détaillées **uniquement à la demande** ("explique-moi ce bousin en détail").
- L'utilisateur veut **comprendre pour modifier et déboguer seul**, pas créer une dépendance à Claude.
- Chaque choix technique : expliquer le quoi, le pourquoi, et le pourquoi pas autrement (quand c'est pertinent).

---

## Règles non négociables du projet

1. **Code unique pour tous les clients**, jamais de dev spécifique (seule la configuration est personnalisée).
2. **Multi-tenant strict** : isolation des données par client dès la conception.
3. **Abstractions obligatoires** pour : Plateforme Agréée (facturation électronique), fournisseur de métadonnées bibliographiques, fournisseur d'encaissement (SumUp/Zettle/Stripe Reader). Jamais de dépendance dure à un prestataire.
4. **UUIDs générés côté client**, API serveur idempotente (indispensable pour synchro offline salon).
5. **Séparation stricte permissions ME / auteur**, non négociable juridiquement.
6. **Conformité caisse (loi anti-fraude TVA 2018)** : 4 conditions (inaltérabilité, sécurisation, conservation 6 ans, archivage) implémentées et documentées.
7. **Hébergement 100 % européen**, RGPD, DPA en place.
8. **Propre avant rapide** : la dette technique aujourd'hui coûte la revente demain (cible ~1 M€ à horizon 3-5 ans).
9. **Internationalisation dès la conception** : tout champ texte visible par l'utilisateur final doit supporter a minima `fr` et `en`. Modèle de données et composants UI conçus pour cette dualité dès v1 (pas de retrofit).

---

## Conventions de code

- TypeScript strict partout, pas de `any` sans justification commentée.
- Tests unitaires sur la logique métier (calcul droits d'auteur, prix unique, permissions).
- Nommage en français pour le métier (`livre`, `auteur`, `maisonEdition`, `depotLibraire`), anglais pour la technique (`handler`, `middleware`, `service`).
- Commits : convention Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

---

## Environnement

- **Poste dev** : Windows 11 + VSCode + WSL2
- **Pré-prod maison** : serveur Ubuntu personnel
- **Outil Claude actuel** : extension Claude Code dans VSCode (pas CLI pour l'instant)

---

*Dernière mise à jour : avril 2026. À actualiser uniquement pour changement structurant.*
