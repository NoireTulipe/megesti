# Projet SaaS — Outil de gestion pour maisons d'édition indépendantes

> Nom du projet : megesti (megesti.com)

> Document de synthèse — Avril 2026
> État : cadrage initial, avant lancement opérationnel

---

## 1. Vision du projet

Transformer un outil de gestion développé sur mesure pour une maison d'édition indépendante, déjà en production depuis plusieurs mois, en produit SaaS commercialisable à l'ensemble des petites maisons d'édition françaises (puis francophones). On repart de 0, mais on s’appuie sur l’expérience reçue.

Le produit n'est pas un outil de gestion générique. C'est un **ERP vertical** conçu par et pour le métier d'éditeur indépendant, intégrant nativement les spécificités du secteur : gestion des dépôts, droits d'auteur, ventes en salon, goodies, saisonnalité éditoriale.

La proposition de valeur se construit autour de deux axes complémentaires :

- **Cœur métier** : un outil pensé pour les éditeurs, par un éditeur, qui remplace le patchwork Excel + Sheets + post-its que la majorité des petites structures utilise aujourd'hui.
- **Conformité réglementaire** : une mise en conformité intégrée avec l'obligation de facturation électronique (B2B), qui devient progressivement obligatoire en France entre septembre 2026 et septembre 2027.

---

## 2. Actifs et avantages compétitifs

### 2.1 Un produit déjà opérationnel

L'outil existe, fonctionne en production, et est utilisé quotidiennement par un premier client réel.

**Architecture actuelle** :
- Front-end développé en React
- Application mobile pour les ventes en salon (synchronisation temps réel avec la base centrale)
- Serveur auto-hébergé chez le client actuel
- Propriété intellectuelle 100 % détenue par le porteur du projet

**Fonctionnalités déjà en place côté gestion** :
- Gestion des stocks (livres, goodies) avec seuils d'alerte
- Enregistrement des ventes avec détail : lieu de vente, mode de paiement, composition du panier, remises
- Gestion des goodies en parallèle des livres
- Enregistrement des frais (commissions, pertes, frais événementiels)
- Calcul automatique des droits d'auteur
- Calcul des coûts de réapprovisionnement
- Gestion des dépôts de livres
- Reporting sur la période choisie : chiffre d'affaires, droits d'auteurs à reverser, bénéfice

**Fonctionnalités déjà en place côté application mobile salon** :
- Enregistrement des paniers en direct
- Prise en charge des modes de paiement
- Prise de photo des livres et goodies
- Navigation par rayon et catégorie (swipe pour changer de rayon)
- Enregistrement des frais événementiels (repas, essence, etc.)
- Visualisation en direct du chiffre d'affaires et du bénéfice
- État des stocks consultable en direct depuis l'événement
- Architecture client-serveur : l'app mobile est une interface, toutes les données restent centralisées

### 2.2 Le profil du fondateur

- Double compétence rare : **développeur + connaissance intime du métier de l'édition** (auteur publié, graphiste pour une maison d'édition)
- Capacité d'industrialisation technique autonome (adaptation multi-tenant, intégrations API)
- Rigueur d'analyse et conception de dispositifs (compétence transférable depuis le parcours professionnel antérieur)

### 2.3 Un premier client captif et allié

Le premier utilisateur du produit est la maison d'édition dirigée par l'épouse du fondateur. Cette configuration offre :

- Un terrain de test permanent sans négociation
- Un accès naturel au réseau des petits éditeurs (salons, syndicats, confrères)
- Un témoignage client fiable et disponible
- Une dynamique de co-construction dans la durée

**Note de transparence commerciale** : le lien familial avec la cliente-témoin devra être clairement assumé dans la communication publique du produit. Une histoire de fondation du type « j'ai développé cet outil pour la maison d'édition de ma conjointe, nous l'utilisons au quotidien, je l'ouvre aujourd'hui à d'autres éditeurs » est parfaitement recevable et même valorisante (logique du *dogfooding*).

---

## 3. Marché cible

### 3.1 Cible primaire

Petites et moyennes maisons d'édition indépendantes françaises :
- Taille : 1 à 10 personnes
- Catalogue actif
- Présence régulière en salon du livre
- Budget outil : typiquement entre 40 et 150 € par mois par structure

### 3.2 Taille estimée du marché français

- Environ **10 000 éditeurs actifs en France**
- Cœur de cible (petits et moyens éditeurs indépendants) : estimé entre 2 000 et 4 000 structures
- Plafond réaliste sur la France seule : 1 000 à 2 500 clients à moyen terme

### 3.3 Alternatives actuelles utilisées par la cible

- Excel + Google Sheets
- Solutions artisanales (Airtable, Notion)
- ERP généralistes (Odoo, Shopify) mal adaptés aux spécificités du métier
- Logiciels anciens et lourds, pensés pour les gros éditeurs et hors de prix pour la cible

### 3.4 Potentiel à moyen-long terme

- Francophonie (Belgique, Suisse, Québec)
- Verticales adjacentes : maisons de disques indépendantes, ateliers d'artistes, petits producteurs culturels (même modèle métier)

---

## 4. Modèle économique

### 4.1 Tarification cible

- **Abonnement SaaS mensuel** : entre 40 € et 120 € par mois selon la taille du client et les modules activés
- **Tarif de référence pour cadrage** : 60 € par mois
- Possibilité de tarif annuel préférentiel (2 mois offerts sur abonnement annuel, par exemple)

### 4.2 Projections indicatives

| Nombre de clients | Revenu récurrent mensuel | Revenu annuel |
|---|---|---|
| 10 | 600 € | 7 200 € |
| 50 | 3 000 € | 36 000 € |
| 100 | 6 000 € | 72 000 € |
| 300 | 18 000 € | 216 000 € |
| 1 000 | 60 000 € | 720 000 € |

À titre indicatif, l'atteinte d'un revenu équivalent à un salaire net confortable (env. 4 000-5 000 € net pour le fondateur après charges) est projetée autour de 80 à 120 clients payants.

### 4.3 Points forts du modèle

- Revenus **récurrents** (ARR), cumulatifs mois après mois
- Rétention typiquement élevée sur un ERP vertical (> 90 % annuel) : un client qui intègre l'outil dans son quotidien change rarement
- Marge brute SaaS (au-delà des coûts d'infrastructure et des frais de plateforme agréée) très élevée
- Scalabilité : la 100e vente coûte significativement moins que la première

---

## 5. Fonctionnalités à intégrer avant commercialisation

### 5.1 Industrialisation de la base existante

**Objectif** : passer d'un outil mono-client auto-hébergé à une architecture SaaS multi-tenant commercialisable.

- Refonte de l'architecture en multi-tenant (isolation des données par client)
- Migration vers un hébergement cloud souverain (OVH, Scaleway, Clever Cloud)
- Système d'inscription en ligne et d'onboarding autonome
- Facturation automatique via Stripe (abonnements, prélèvements récurrents)
- Paramétrage côté client (configuration des royalties, catégories, utilisateurs)
- Gestion multi-utilisateurs par organisation (rôles, permissions)
- Sauvegardes automatiques
- Conformité RGPD avec sous-traitant hébergeur qualifié (DPA en place, clauses contractuelles)
- Documentation utilisateur de base et tutoriels vidéo
- Support client minimal (formulaire, email, ticketing)

**Effort estimé** : 3 à 6 mois de travail concentré.

### 5.2 Conformité facturation électronique (priorité stratégique)

**Contexte réglementaire**

La facturation électronique devient progressivement obligatoire en France :

- **1er septembre 2026** : toutes les entreprises assujetties à la TVA doivent pouvoir **recevoir** des factures électroniques
- **1er septembre 2026** : les grandes entreprises et ETI doivent **émettre** leurs factures électroniques
- **1er septembre 2027** : les TPE, PME et micro-entreprises (qui correspondent à la cible de ce projet) doivent à leur tour **émettre** leurs factures au format électronique

Formats approuvés : Factur-X, UBL, CII.
Canal obligatoire : plateforme agréée (ex-PDP) certifiée par l'administration fiscale.

**Approche retenue**

Le projet **ne cherche pas à devenir plateforme agréée** (procédure lourde, exigences financières et techniques hors d'atteinte pour un projet solo). Il s'**interface** avec une plateforme agréée partenaire :

- Sélection d'un partenaire PDP (candidats : Pennylane, Sage, Cegid, Docaposte, Tenor, etc.)
- Intégration des API du partenaire
- Expérience utilisateur transparente : l'éditeur émet ses factures depuis l'interface du produit, la PDP gère en arrière-plan la transmission vers l'administration fiscale
- Gestion des formats Factur-X, UBL, CII en sortie

**Effort estimé** : 2 à 4 mois selon le partenaire.

**Valeur commerciale** : considérable. L'argument « outil métier d'édition **ET** mise en conformité facturation électronique » devient un argument de vente central sur la fenêtre juillet 2026 - septembre 2027.

### 5.3 Export comptable propre

**Principe** : ne pas chercher à concurrencer les logiciels de comptabilité complets (Pennylane, Tiime, Dougs, Indy, Cegid, Sage, EBP), mais **s'interfacer proprement** avec eux.

- Génération des écritures comptables pré-formatées (plan comptable général, libellés, TVA)
- Export au format standard : FEC (Fichier des Écritures Comptables), CSV normalisés
- Intégrations natives API avec les deux ou trois plateformes comptables les plus utilisées par la cible (a minima : Pennylane, Tiime)
- Export OFX optionnel

**Bénéfice relationnel** : les experts-comptables deviennent prescripteurs du produit plutôt que concurrents inquiets. Un expert-comptable qui gagne du temps sur ses clients éditeurs grâce à l'outil est un canal de diffusion puissant.

**Effort estimé** : 1 à 2 mois.

### 5.4 Encaissement en salon (SumUp / Stripe Reader)

- Intégration via SDK / API du ou des fournisseurs retenus
- Déclenchement du paiement par carte depuis l'app mobile salon
- Récupération des confirmations et enregistrement de la vente dans la base
- Gestion des cas d'erreur, des remboursements, des reçus

**Choix stratégique à trancher** : intégration SumUp seul (plus simple, plus rapide) ou intégration multi-fournisseurs (SumUp + Zettle + Stripe Reader) pour ne pas perdre les prospects déjà équipés ailleurs.

**Effort estimé** : 2 à 4 semaines pour un premier fournisseur, temps marginal pour les suivants.

---

## 6. Priorisation des chantiers techniques

Ordre recommandé, compte tenu du rapport effort / valeur et du calendrier réglementaire :

| Priorité | Chantier | Effort | Valeur | Jalon cible |
|---|---|---|---|---|
| 1 | Industrialisation multi-tenant | 3-6 mois | Bloquante | Été 2026 |
| 2 | Intégration plateforme agréée (facturation électronique) | 2-4 mois | Stratégique | Automne 2026 |
| 3 | Export comptable propre | 1-2 mois | Forte | Automne 2026 |
| 4 | Intégration SumUp | 2-4 semaines | Immédiate | En parallèle |

---

## 7. Feuille de route opérationnelle

### 7.1 Avril - juin 2026 : cadrage et validation

- **Positionnement produit** : nom commercial, baseline, pitch court en trois phrases, identité visuelle initiale
- **Cartographie du marché** : liste nominative de 30 à 50 éditeurs cibles (via le réseau de la cliente-témoin)
- **Entretiens utilisateurs** : 10 entretiens qualitatifs avec des éditeurs amis ou confrères. Objectifs : valider le besoin, mesurer la disposition à payer, récolter 3 à 5 lettres d'intention
- **Sécurisation juridique** : consultation avec un avocat spécialisé propriété intellectuelle (validation du 100 % propriété du code) ; dépôt INPI du nom commercial ; éventuelle enveloppe Soleau sur les spécifications
- **Choix du partenaire PDP** : étude comparative, signature du contrat technique, accès aux environnements de test
- **Structure juridique** : création d'une SASU (ou équivalent selon conseil comptable), ouverture compte professionnel
- **Décision go / no-go** à la fin de cette phase, sur la base des données collectées

### 7.2 Juillet - octobre 2026 : industrialisation

- Refonte multi-tenant du produit
- Intégration PDP finalisée (émission Factur-X fonctionnelle)
- Intégration SumUp / Stripe Reader
- Export comptable propre (FEC, API Pennylane au minimum)
- Site vitrine professionnel avec démo vidéo
- Documentation utilisateur
- Version beta lancée avec 3 à 5 éditeurs pilotes à tarif préférentiel (ex. 30 € par mois pour la première année au lieu du tarif cible)

### 7.3 Novembre 2026 - mars 2027 : commercialisation ouverte

- Ouverture commerciale en tarif plein
- Communication ciblée autour de l'argument « conformité facturation électronique + gestion métier édition »
- Présence aux salons et festivals professionnels de l'édition indépendante
- Relations avec les syndicats professionnels (SNE, syndicats régionaux)
- Démarchage direct auprès de la liste de 50 éditeurs cibles constituée en phase 7.1
- **Objectif** : 20 à 40 clients payants à fin mars 2027

### 7.4 Avril - août 2027 : accélération

- Les éditeurs non équipés paniquent à l'approche du 1er septembre 2027
- Présence renforcée sur les salons de printemps-été
- Campagnes ciblées (webinaires, emails)
- Partenariats avec experts-comptables spécialisés
- **Objectif** : 80 à 150 clients payants au 1er septembre 2027

### 7.5 À partir de septembre 2027

- Base installée consolidée
- Expansion francophone (Belgique, Suisse, Québec)
- Réflexion sur verticales adjacentes (maisons de disques indépendantes, petits producteurs culturels)
- Évolution possible vers une marketplace de distribution ou une place de marché aux droits (horizon 3-5 ans)

---

## 8. Situation personnelle et transition

### 8.1 Articulation avec le poste actuel

Le porteur du projet est actuellement fonctionnaire. La séquence ci-dessus permet une **transition progressive** :

- **Phase 7.1 (avril-juin 2026)** : menée sur temps personnel (soirs et week-ends), sans changement de statut. Pas de décision irréversible à ce stade.
- **Phase 7.2 (juillet-octobre 2026)** : deux options — menée en parallèle du poste actuel (rythme intense mais salaire maintenu), ou démarrée en **disponibilité pour création d'entreprise** (droit ouvert aux fonctionnaires titulaires, jusqu'à 3 ans renouvelables, retour possible en cas d'échec).
- **Option à étudier** : **rupture conventionnelle** + **ARCE** (versement en capital de 45 % des droits chômage) pour financer l'année de lancement.

### 8.2 Activités complémentaires de transition

En parallèle de la construction du SaaS, activités créatives de complément pour sécuriser les revenus court terme :

- Prestations graphiques pour cabinets et petites structures (400 à 800 € par jour)
- Illustration éditoriale pour blogs et médias B2B (tarification au visuel ou forfait mensuel)

Objectif de cette activité parallèle : 1 500 à 3 000 € de revenus mensuels pendant la phase d'industrialisation du SaaS.

### 8.3 Démarches déontologiques

Le projet n'ayant **aucun lien** avec les fonctions actuelles du fondateur (aucune activité du produit ne touche au domaine professionnel d'exercice), les démarches déontologiques sont légères. À vérifier néanmoins :

- Information de la hiérarchie (obligation déclarative selon le cas)
- Saisine éventuelle du référent déontologue de l'administration d'appartenance
- Vérification de l'absence de conflit d'intérêts formel

---

## 9. Investissement initial estimé

| Poste | Montant estimé |
|---|---|
| Hébergement cloud (première année) | 1 500 € - 3 000 € |
| Services tiers (Stripe, emailing, monitoring, etc.) | 1 000 € - 2 000 € |
| Frais juridiques (création SASU, conseil PI, contrat PDP) | 1 500 € - 3 000 € |
| Dépôt INPI (nom commercial, éventuelle enveloppe Soleau) | 500 € - 1 000 € |
| Site vitrine et identité visuelle | 1 000 € - 3 000 € |
| Déplacements salons et événements professionnels | 2 000 € - 5 000 € |
| Trésorerie de sécurité (6 mois de charges fixes) | 10 000 € - 15 000 € |
| **Total estimé** | **17 500 € - 32 000 €** |

**Sources de financement envisageables** :
- ARCE (transformation de 45 % des droits chômage en capital, sous réserve de rupture conventionnelle ou équivalent)
- Prêt d'honneur Initiative France ou Réseau Entreprendre (0 % d'intérêt, sans garantie personnelle, 15 000 à 50 000 €)
- ACRE (exonération partielle de charges sociales la première année)
- Autofinancement partiel via activités créatives parallèles

---

## 10. Facteurs de risque et points de vigilance

### 10.1 Risque produit

- **Dérive de périmètre** : la tentation d'intégrer une comptabilité complète, ou d'élargir trop vite à d'autres secteurs, doit être résistée. Le projet gagne à rester focalisé sur son cœur de cible tant que la base n'est pas solide.

### 10.2 Risque commercial

- **Dépendance à un canal unique** (le réseau de la cliente-témoin) : à diversifier rapidement par la présence événementielle et le démarchage direct.
- **Cycle de vente long** en B2B : un éditeur met plusieurs semaines entre la démo et la décision d'achat. À intégrer dans les projections.

### 10.3 Risque technique

- **Dépendance à la plateforme agréée partenaire** : le choix du partenaire PDP est stratégique. Prévoir la capacité de changer de partenaire en cas de défaillance (abstraction technique dans le code).

### 10.4 Risque personnel

- **Charge mentale de la double activité** pendant la phase de construction : à anticiper, à réguler, à discuter en couple.
- **Isolement de l'entrepreneur solo** : prévoir des rythmes d'échange réguliers avec pairs (réseaux d'indie hackers français, groupes de fondateurs SaaS).

---

## 11. Prochaines actions concrètes

1. **Cette semaine** : description détaillée du produit pour cadrage du positionnement (captures d'écran, vocabulaire maison, fonctionnalités différenciantes)
2. **Dans les 15 jours** : choix de 3-4 directions de positionnement avec nom et baseline, sélection finale
3. **Dans le mois** : liste cartographiée de 30-50 éditeurs cibles avec votre épouse
4. **Dans les 6 semaines** : 10 entretiens utilisateurs réalisés, synthèse des retours
5. **Dans les 2 mois** : décision go / no-go documentée, choix du partenaire PDP engagé, création de la structure juridique
6. **Dans les 4 mois** : version multi-tenant en développement actif, premiers éditeurs pilotes en cours d'onboarding

---

*Document de travail — À enrichir au fil du cadrage. Version 1.0 — Avril 2026.*
