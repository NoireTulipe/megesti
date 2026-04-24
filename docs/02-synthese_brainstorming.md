# Synthèse du brainstorming — Compléments au document de cadrage

> Document compagnon du cadrage initial. Avril 2026.
> À lire en complément du document principal, pas en remplacement.
> Synthèse des décisions et précisions issues de l'échange exploratoire.

---

## 1. Positionnement commercial consolidé

### 1.1 Le triple argument de conformité réglementaire

Le produit éditeur s'appuie sur trois conformités légales cumulées, qu'aucun concurrent généraliste ne peut aligner simultanément avec la spécificité métier de l'édition :

1. **Caisse conforme à la loi anti-fraude TVA de 2018** (article 286-I-3° bis du CGI). L'application enregistre les ventes au comptant en salon et constitue à ce titre un logiciel de caisse soumis aux 4 conditions : inaltérabilité, sécurisation, conservation, archivage sur 6 ans. Une auto-attestation de conformité est suffisante pour la commercialisation, sous réserve que l'implémentation technique respecte effectivement les 4 conditions.

2. **Facturation électronique conforme** à la réforme 2026-2027, via intégration d'une Plateforme Agréée (PA, ex-PDP) partenaire.

3. **Conformité RGPD** via hébergement européen, DPA signés, registre des traitements tenu, procédures de violation documentées.

Cet ensemble est un argument commercial central, à mettre en avant dans la brochure et le site vitrine. Il transforme l'outil en **assurance juridique déguisée en outil de gestion**. À 7 500 € d'amende par logiciel non conforme en cas de contrôle sur la caisse, la tranquillité apportée justifie seule une large part de l'abonnement.

### 1.2 La ligne éditoriale du discours

Le produit ne se présente jamais comme un « logiciel de gestion » générique. Il se présente comme :

- Un outil métier édition, conçu par et pour le métier
- Un dispositif de mise en conformité réglementaire
- Un compagnon du quotidien qui remplace le patchwork Excel + tableurs + post-its

Les trois angles se combinent dans un même discours, jamais isolés.

---

## 2. Architecture d'offres validée

### 2.1 Trois formules au lancement (pas plus)

| Formule | Cible | Contenu |
|---|---|---|
| **Auteur** (~5 €/mois, prix à caler après étude) | Auteur auto-édité ou hybride | Agrégation multi-plateformes, journal de salons, bilan fiscal annuel, facturation basique |
| **Éditeur** (~60 € mensuel / tarif préférentiel annuel) | Petite maison d'édition, 1-10 personnes | Cœur du produit initial + conformités + multi-auteurs + multi-utilisateurs |
| **Éditeur + salon** (~90-120 €/mois) | Maison d'édition active en événementiel | Éditeur + app mobile salon complète + encaissement SumUp + conformité caisse renforcée |

Les prix sont indicatifs et seront calés après les 10 entretiens utilisateurs de la phase 7.1 (cf. document de cadrage).

### 2.2 Frontière stricte entre offre Auteur et offre Éditeur

**Ne jamais déplacer** pour éviter la cannibalisation :

| Fonctionnalité | Auteur (5 €) | Éditeur (60+ €) |
|---|---|---|
| Gestion d'auteurs tiers (contrats, taux, à-valoir) | Non | Oui |
| Calcul et reversement de droits d'auteur | Non | Oui |
| Redditions de comptes annuelles (obligation légale 2022) | Non | Oui |
| Facturation électronique via PA | Basique (module optionnel) | Complète |
| Gestion de dépôts libraires | Non | Oui |
| Multi-utilisateurs par organisation | Non | Oui |
| Export comptable (FEC, Pennylane, Tiime) | Non | Oui |
| Stock physique avec seuils, coûts de réapprovisionnement | Limité | Complet |

**Règle** : un utilisateur qui grandit migre vers Éditeur. Un utilisateur qui se lance démarre en Auteur. Les deux produits nourrissent le même entonnoir.

### 2.3 Précisions sur l'offre Auteur

**Positionnement** : « Le tableau de bord de l'auteur indépendant francophone. »

**Périmètre v1** :
- Agrégation des ventes multi-plateformes par **import CSV manuel** (KDP, Kobo Writing Life, Bookelis, BoD, Librinova, etc.)
- Journal de salons et ventes directes (réutilisation massive du code app mobile existant)
- Bilan fiscal annuel agrégé (BNC/TS, mémos de cases à remplir sur 2042 C PRO, rappels URSSAF Limousin)
- **Module facturation basique** : facture ponctuelle pour bibliothèques, collectivités, centrales d'achat (grandes surfaces qui encaissent pour l'auteur et demandent une facture au terme de la vente)

**Ce que l'offre Auteur n'est pas** :
- Pas un outil d'écriture (marché saturé : Scrivener, Novelist, JotterPad, iA Writer, Ulysses, Writeometer)
- Pas un outil de comptabilité complète
- Pas une marketplace de distribution

**Marge réelle à 5 €/mois** : ~70-80 % après Stripe, hébergement, emails transactionnels. Soit 42-48 €/an par client. Viable **uniquement si le coût de support reste proche de zéro par client**. D'où la contrainte produit : l'offre Auteur doit être strictement auto-servie, pas de configuration manuelle offerte, support email uniquement, FAQ soignée, tutoriels intégrés.

### 2.4 Boutique Auteur — feature pivot v2

**Concept** : page boutique personnelle pour l'auteur, accessible via QR code, générant des ventes en ligne.

**Composition** :
- Sous-domaine inclus dans l'abonnement (`prenomnom.nomdusaas.fr` ou équivalent)
- Possibilité de connecter un domaine personnel apporté par l'auteur (via CNAME, sans jouer le rôle de registrar)
- Page sobre, personnalisable (couleur, logo, titre), catalogue limité (10 livres max)
- Paiement via Stripe Connect en direct : l'argent va au compte Stripe de l'auteur, le SaaS ne touche rien
- **Aucune commission sur les ventes** — principe fondateur à tenir dans la durée
- Notifications de vente multi-canal : push mobile + email + badge dans l'app web
- Livraison entièrement à la charge de l'auteur (pas de gestion logistique côté SaaS)

**Pourquoi pas de commission** : préserve le positionnement d'outil (non marketplace), évite les obligations réglementaires DSP2, simplifie la fiscalité, devient un argument commercial fort face aux plateformes d'auto-édition qui prennent 30-60 %.

**Roadmap** : à ne **pas** intégrer en v1. Cible v2 à 3-6 mois après lancement, après retours de 50-100 clients Auteur actifs. Justifie une montée en gamme naturelle (ex : offre « Auteur + » à 8-10 €/mois avec boutique incluse).

**Conformité e-commerce** à prévoir pour la v2 : CGV boutique type, mentions légales, droit de rétractation 14 jours (avec exception livres dédicacés personnalisés), gestion des remboursements.

### 2.5 Rattachement des auteurs à une Maison d'Édition cliente

**Concept** : une ME abonnée à l'offre Éditeur + salon peut rattacher ses auteurs à son compte. Chaque auteur rattaché bénéficie d'une version spécifique de l'application pour enregistrer ses ventes en salon, avec gestion distinguée entre stock ME et stock propre.

**Motif** : résout un vrai trou de traçabilité du métier. Aujourd'hui, un auteur en salon qui vend des livres reçus en dépôt d'une ME note à la louche et communique le bilan par SMS ou email. La ME le croit sur parole. Les droits d'auteur se calculent sur déclaratif. Ce mode de fonctionnement est à la fois fragile juridiquement (loi anti-fraude TVA), source de tensions dans la relation ME-auteur, et impossible à piloter rigoureusement côté stock.

**Proposition de valeur** :
- Pour la ME : traçabilité temps réel, calcul automatique des droits d'auteur salon, gestion unifiée du stock éclaté (entrepôt central, dépôts libraires, dépôts auteurs), argument de recrutement d'auteurs
- Pour l'auteur rattaché : accès gratuit à l'app mobile salon via sa ME, sans débourser les 5 €/mois de l'offre Auteur autonome

#### Modèle d'usage technique

L'auteur a un **compte Auteur** dans l'écosystème SaaS, rattaché à la ME qui le sponsorise. Il utilise l'app mobile salon comme s'il était un utilisateur autonome. Chaque vente saisie est qualifiée par la provenance du livre :

- **Stock ME** : livre confié en dépôt par la ME pour l'événement. La vente alimente le CA de la ME et déclenche automatiquement le calcul des droits d'auteur contractuels.
- **Stock propre** : livre acheté par l'auteur à sa ME à tarif préférentiel. La vente est 100 % pour l'auteur. Concerne uniquement les auteurs disposant par ailleurs d'un abonnement Auteur autonome (voir règle ci-dessous).

La qualification peut être préconfigurée par lot : avant un salon, la ME pousse N exemplaires « stock ME » sur l'appareil de l'auteur ; l'auteur peut avoir en parallèle ses propres exemplaires « stock propre » enregistrés s'il a un abonnement.

#### Règles d'accès (validées)

**Règle 1 — Auteur rattaché sans abonnement personnel**
- L'auteur voit **uniquement** les livres que la ME lui a confiés (stock ME)
- Il enregistre ses ventes sur ces livres, alimentant le bilan ME
- Il ne peut pas ajouter de livres personnels, pas gérer de stock propre, pas accéder au bilan fiscal agrégé multi-plateformes
- Accès gratuit via l'abonnement de la ME

**Règle 2 — Auteur rattaché avec abonnement Auteur personnel**
- Il voit à la fois les livres confiés par sa/ses ME et ses livres personnels
- Il peut enregistrer ses ventes de stock propre en parallèle, elles alimentent son bilan personnel
- Il accède au bilan fiscal agrégé multi-plateformes (fonctionnalité de l'offre Auteur à 5 €/mois)
- Il paie son abonnement Auteur, en plus de bénéficier gratuitement du volet stock ME via sa ME

Cette double règle crée un pont naturel entre les deux offres : l'auteur rattaché qui veut gérer aussi ses propres ventes salon passe à l'offre Auteur payante, sans friction, sans réinstallation, sans perte de contexte.

#### Règles de confidentialité (validées)

**Règle 3 — La ME ne voit que ce qui la concerne**
- La ME accède aux ventes de ses auteurs rattachés **uniquement** pour les livres dont elle est éditrice (stock ME)
- La ME n'accède jamais aux ventes de stock propre de ses auteurs
- La ME n'accède jamais aux ventes d'un auteur faites sous un autre abonnement (par exemple un auteur hybride ayant un abonnement Auteur autonome et des ventes KDP personnelles)
- La ME n'accède jamais au bilan fiscal personnel de ses auteurs

Cette séparation stricte est **non négociable** : elle protège la vie privée de l'auteur (indépendant juridiquement), et protège le SaaS contre tout risque de contentieux avec les syndicats d'auteurs (SGDL, CPE). La permission fine est intégrée dès l'architecture multi-tenant.

#### Modèle tarifaire proposé

L'offre **Éditeur + salon** inclut un **quota d'auteurs rattachés**, par exemple 3 à 5 auteurs inclus, puis un tarif dégressif par auteur supplémentaire (de l'ordre de +3 €/mois par auteur au-delà).

Les seuils et tarifs précis sont à caler après les entretiens utilisateurs et selon la taille typique des catalogues ME rencontrés. Une ME publiant 15 auteurs actifs aura une logique tarifaire différente d'une ME publiant 3 auteurs.

#### Gestion du départ d'un auteur

Quand un auteur quitte une ME :
- L'auteur peut conserver son compte en basculant vers un abonnement Auteur autonome payé par lui-même (continuité de l'historique personnel)
- À défaut, il peut exporter ses données personnelles et fermer son compte
- La ME conserve l'historique des ventes passées la concernant (pour ses obligations comptables et fiscales), mais perd l'accès aux nouvelles ventes de l'auteur post-rupture

#### Implications techniques additionnelles

**Facturation ME → auteur (stock propre)** : quand la ME vend du stock propre à son auteur à tarif préférentiel, c'est une transaction commerciale interne. L'app doit générer automatiquement la facture correspondante (B2B si auteur avec structure, B2C sinon). Cette facture est soumise à la réforme facturation électronique 2027 pour le volet B2B.

**Conformité caisse dédoublée en salon** : lorsqu'un auteur vend à la fois du stock ME et du stock propre sur un même événement, l'app doit tenir **deux espaces caisse parallèles** dans la même session :
- Un pour les ventes ME (conformité caisse au nom de la ME)
- Un pour les ventes auteur (conformité caisse au nom de l'auteur, s'il est assujetti)
- Séquences de tickets distinctes, clôtures distinctes, archivage distinct

Chaque espace caisse respecte indépendamment les 4 conditions de la loi anti-fraude TVA 2018.

**Argumentaire commercial à intégrer à la brochure** : « Offrez à vos auteurs l'outil de suivi de leurs salons. Gardez la maîtrise de votre stock confié. Automatisez le calcul des droits d'auteur. Fidélisez vos auteurs avec un service inédit. »

#### Priorisation

Feature **v1 de l'offre Éditeur + salon** si le planning le permet. À défaut, **v1.5** (3 mois après lancement). Suffisamment différenciateur pour mériter un effort technique dès le début, d'autant qu'elle réutilise massivement l'infrastructure existante (app mobile, base de données, gestion des ventes) — le travail consiste essentiellement à ajouter la couche de permissions et la qualification stock ME / stock propre.

---

## 3. Architecture technique — décisions structurantes

### 3.1 Choix tranché : SaaS pur, 100 % web

**Décision** : application web unique, accessible depuis navigateur, installable en PWA pour ceux qui veulent une icône sur le bureau.

**Motifs** :
- Un seul dev solo : doubler la surface de maintenance (web + desktop Electron/Tauri) est une mauvaise allocation de temps
- L'app mobile native salon couvre déjà le besoin offline sur le terrain
- Les clients cibles utilisent déjà du SaaS (Pennylane, Gmail, Drive) ; le paradigme web leur est familier
- La conformité facturation électronique impose des traitements côté serveur
- Déploiement instantané des mises à jour (important en contexte réglementaire évolutif)
- Cohérence avec le modèle économique d'abonnement

**Traitement des objections habituelles** :
- Icône sur le bureau → PWA avec installation (`Add to Home Screen`)
- Accès matériel (douchettes, imprimantes tickets, SumUp) → Web Bluetooth, Web USB, Web Serial
- Perception de lenteur → front-end moderne optimisé, cache local, skeleton loaders
- Mode dégradé en cas de réseau instable sur poste bureau → Service Workers pour consultation

**App mobile salon** : reste native (framework déjà en place). Garde son rôle spécifique : offline prolongé, géolocalisation, accès hardware intensif, notifications push système.

### 3.2 Gestion du mode offline et synchronisation (spec critique)

Le contexte des salons impose une gestion rigoureuse de l'offline. Trois comportements obligatoires :

**Détection d'état réseau applicative**
- Ne pas se fier à `navigator.onLine` ou aux indicateurs OS
- Ping applicatif périodique vers un endpoint de santé du serveur (captive portals, latence extrême, paquets perdus sont courants en gymnase/chapiteau)
- Si le ping échoue au-delà d'un seuil (ex : 3 échecs consécutifs), bascule automatique en mode hors ligne

**Mode dégradé local**
- Base de données locale structurée : SQLite sur mobile natif, IndexedDB sur PWA web (pas de simple localStorage)
- Toute opération (vente, encaissement, frais, modification) est enregistrée localement avec un identifiant unique généré **côté client** au moment de l'action (UUID v4 ou combinaison device_id + timestamp + compteur)
- File d'attente de synchronisation persistante, préservant l'ordre des opérations
- Indicateur visuel permanent : badge « Synchronisé » (vert) / « Hors ligne — N opérations en attente » (orange) / « Synchronisation en cours » (bleu)
- Page de détail accessible en un clic listant les opérations en attente avec horodatage

**Synchronisation réconciliée au retour du réseau**
- API serveur idempotente : toute route de création accepte l'identifiant client, renvoie succès silencieux si déjà présent
- Rejouer les opérations dans l'ordre d'origine (pas d'ordre arbitraire)
- Double horodatage stocké : `created_at` (moment de la vente sur l'appareil, fait foi fiscalement) et `synced_at` (arrivée serveur)
- Retry automatique avec backoff exponentiel en cas d'échec transitoire
- Notification claire à l'utilisateur une fois la synchro complète : « Les N ventes du salon ont été synchronisées avec succès »

**Gestion des conflits**
- Règle : stock peut passer en négatif en cas de vente concurrente, alerte visuelle affichée (« Stock de X : -1, vérifier »)
- La résolution reste humaine (réimpression, livre d'expo, commande d'urgence)
- Ne pas tenter de gérer les conflits automatiquement : alerte, pas décision

**Purge locale**
- Les données synchronisées avec succès peuvent être purgées de la base locale selon politique définie (ex : après 30 jours confirmés serveur-side)
- Ne jamais purger avant confirmation explicite du serveur
- La base locale doit pouvoir contenir plusieurs jours de ventes intensives sans saturer

**Effort estimé** : 2 à 4 semaines de développement pour une implémentation propre. Non négociable : la confiance du client repose intégralement sur ce point.

### 3.3 Architecture des cron jobs et traitements différés

Pour les tâches récurrentes (imports programmés, notifications, relances, calculs de nuit) :

- **Idempotence** : chaque job relancé deux fois ne crée pas de doublons
- **Logging systématique** avec niveaux (info, warn, error), centralisé et consultable
- **Retry automatique** sur échec transitoire : 3 essais avec backoff (5 min, 30 min, 2h)
- **Alertes immédiates** au fondateur sur échec définitif (bot Telegram, Slack, ou service type OpsGenie)
- **Dashboard d'observabilité minimal** : clients actifs, jobs/heure, taux de succès
- **Monitoring externe** : service type Better Uptime (gratuit petit volume) pour ping de santé toutes les 5 minutes

Budget total de cette infrastructure : gratuit à ~20 €/mois. Non optionnel.

### 3.4 Abstraction de la plateforme agréée (PA)

**Règle d'architecture** : toute communication avec la PA partenaire doit être encapsulée dans une **couche d'abstraction**.

En pratique : une interface interne (ex : `InvoiceTransmissionService`) expose des méthodes génériques (`submit`, `status`, `retrieve`) indépendantes de la PA spécifique. L'implémentation concrète pour la PA retenue est branchée derrière.

Objectif : pouvoir changer de PA en cas de défaillance, de hausse tarifaire, ou de meilleure offre, sans refonte du produit. L'expérience réglementaire de la France n'est pas stabilisée sur le long terme, et il serait dangereux d'être pieds et poings liés à un partenaire.

### 3.5 Module de conformité caisse (loi anti-fraude TVA 2018)

Les 4 conditions à respecter techniquement et à documenter :

1. **Inaltérabilité** : toute vente enregistrée ne peut être modifiée a posteriori. Une correction se fait par contre-écriture (annulation + nouvelle écriture), jamais par modification directe.
2. **Sécurisation** : journal d'événements inaltérable traçant toute action (création, annulation, clôture de journée). Chaîne d'intégrité (hash cumulatif entre lignes) pour détecter toute manipulation.
3. **Conservation** : données conservées au minimum 6 ans, accessibles en cas de contrôle.
4. **Archivage** : clôtures journalières, mensuelles, annuelles automatisées, archivées dans un format lisible et complet.

À auditer sur le code existant avant industrialisation. Si l'implémentation actuelle ne couvre pas les 4 conditions, prévoir la remise à niveau maintenant — rétroactivement sur des milliers de ventes plus tard, ce sera bien plus complexe.

### 3.6 Prix unique du livre — module de garde-fou

Règle : alerter (pas bloquer) si une remise dépasse 5 % du prix public.

Implémentation :
- Champ « motif de dérogation » avec menu déroulant au-delà du seuil légal : exposition, occasion (rupture/livre ayant été exposé), vente aux collectivités éligibles, bibliothèque, épuisement, autre (avec saisie libre)
- Traçabilité de toutes les dérogations pour contrôle fiscal éventuel
- Pas de blocage dur : l'utilisateur reste maître de sa vente

Valeur : zéro concurrent généraliste n'intègre ce réflexe métier. Argument de vente à expliciter.

### 3.7 Scan de codes-barres ISBN/EAN

**Contexte métier** : tout livre publié porte un **ISBN-13** imprimé en 4e de couverture au format **code-barres EAN-13**. Les goodies industriels portent des EAN-13 classiques. Scanner au lieu de taper, c'est :

- **Saisie de catalogue accélérée** : création d'une fiche livre à partir du scan (pré-remplissage possible via bases bibliographiques : BnF, Electre, Google Books, Open Library)
- **Vente en salon accélérée** : panier client composé en quelques secondes plutôt qu'en navigation manuelle par rayon
- **Fiabilité renforcée** : zéro erreur de saisie, réconciliation stock fiable
- **Inventaire physique simplifié** : douchette ou caméra du téléphone, pointage rapide
- **Argument commercial fort** : différencie immédiatement face aux concurrents tableur

**Implémentation technique** :

- **Mobile (React Native + Expo)** : module natif `expo-barcode-scanner` ou `expo-camera` avec détection de codes. Support EAN-13, EAN-8, QR code. Performant, fiable, gratuit.
- **Web (React + PWA)** : API `BarcodeDetector` native sur Chrome/Edge (suffisant pour cible pro). Fallback **ZXing-js** ou **QuaggaJS** pour navigateurs non supportés.
- **Douchettes USB/Bluetooth** (souvent utilisées par les libraires et certains éditeurs sur stand) : elles se comportent comme un clavier HID et "tapent" le code dans le champ actif. Gestion simple côté UI : champ dédié avec détection automatique du retour chariot final émis par la douchette.

**Enrichissement automatique de fiche livre** :

Au scan d'un ISBN, appel d'une API bibliographique pour pré-remplir la fiche :
- **BnF** (catalogue général via SRU/Z39.50) : gratuit, exhaustif sur le fonds français
- **Electre** : référence du marché pro français, payant (à évaluer après premières ventes)
- **Google Books API** / **Open Library** : gratuit, complément international

L'utilisateur valide/corrige les champs auto-remplis (titre, auteur, éditeur, nombre de pages, année) puis ajoute ses propres informations (prix public, taux droits d'auteur, catégorie interne, stock initial).

**Abstraction à prévoir dès le départ** : même logique que pour la PA — interface `BookMetadataProvider` permettant de basculer de fournisseur bibliographique sans refonte.

**Effort estimé** : 1 à 2 semaines pour l'intégration complète (scan mobile + scan web + support douchette HID + un provider de métadonnées).

---

## 4. Onboarding, UX et service client

### 4.1 Configuration initiale assurée par le fondateur

**Principe** : pour chaque nouveau client Éditeur, le fondateur prend en charge la configuration initiale :
- Import du catalogue existant
- Paramétrage des taux de droits d'auteur par contrat
- Création des catégories, rayons, collections propres au client
- Création des comptes utilisateurs
- Mise en place des intégrations (PA, SumUp, comptabilité)

**Règle absolue** : code unique pour tous, jamais de personnalisation par développement spécifique. Seule la configuration applicative est personnalisée.

**Politique commerciale** : installation clé en main **offerte si engagement annuel**, **facturée ~200-400 € si mensuel**. Oriente vers les contrats longs sans forcer.

**Industrialisation progressive** : documenter chaque configuration pour constituer progressivement des **modèles pré-configurés par profil d'éditeur** (BD, jeunesse, poésie, SF, auto-édité structuré, etc.). Objectif à 50-100 clients : configuration quasi-automatique via modèle + ajustements marginaux.

### 4.2 Tutoriel embarqué type jeu vidéo

**Spec produit** : tutoriel d'onboarding piloté par une mascotte, pas un système de « Did you know? » standard.

- Mascotte au ton sympathique (à concevoir avec l'épouse, compétence graphique maison)
- Guidage contextuel par bulles, progressif
- **Relançable à tout moment sur un point précis** depuis un bouton « ? » permanent dans l'interface
- Ton et identité visuelle cohérents avec le positionnement « outil métier du livre » (pas corporate, pas austère)

Cet élément est un **différenciateur produit**. Les SaaS comptables/gestion classiques sont grisâtres et intimidants. La mascotte signe qu'un humain du livre a conçu l'outil.

### 4.3 Support client — discipline à tenir dès le jour 1

Le support est ce qui tue les SaaS solo, pas le produit. Parades à instaurer dès avant le premier client payant :

- **Documentation exhaustive** avant lancement, pas après
- **FAQ interactive intégrée à l'app** couvrant les 30 questions anticipables
- **Vidéos tutoriels courtes** (2-3 min) sur chaque fonctionnalité, par l'épouse quand c'est pertinent (crédibilité métier)
- **Support asynchrone uniquement** : tickets email, pas de chat live, pas de téléphone grand public
- **SLA clair** : réponse sous 48h ouvrées, jamais moins, jamais davantage promis
- **Créneau dédié** : ex. 9h-11h pour le support, le reste de la journée consacré à développement/vente
- **Page statut publique** (`status.nomdusaas.fr`) pour incidents en cours

**Anticipation du renfort** : à 50 clients, identifier qui pourra prendre 50 % du support à 80 clients (alternant, freelance, épouse en complément). Ne pas attendre la saturation.

### 4.4 Parcours commercial validé

**Canal principal** : email personnalisé → brochure soignée → bac à sable pré-rempli → démo en visio si demande.

**Composants à produire** :

- **Brochure PDF** : mise en page soignée, typographie travaillée, ton humain et précis. Pas de jargon SaaS (« empower », « solution »). La brochure elle-même est une démonstration de la compréhension métier. Utiliser le background graphique du fondateur.

- **Email d'envoi** : court, personnalisé (prénom, pas « Madame, Monsieur »), structure : origine du projet (développé avec épouse éditrice) + proposition sans engagement + coordonnées pour échange direct + lien brochure + lien démo.

- **Vidéo de démonstration** : 2 minutes maximum. **Mettre en avant l'épouse** (ou une éditrice réelle), pas le fondateur dev. Vocabulaire éditeur, pas vocabulaire dev. Cas d'usage concrets du quotidien.

- **Bac à sable** : compte de démonstration **pré-rempli** avec un catalogue fictif mais crédible, des ventes simulées, des droits d'auteur calculés. L'utilisateur voit son quotidien futur en 30 secondes, pas un compte vide.

**Présence salon** : mode passif — stand partagé ou pancarte « démo sur demande », pas de démarchage actif des passants. Cohérent avec la personnalité du fondateur.

### 4.5 Stratégie d'acquisition par offre

**Offre Éditeur** (B2B, ticket moyen, cycle long) :
- Salons professionnels édition (priorité haute, budget déplacement à prévoir)
- Démarchage email ciblé (liste de 50 éditeurs constituée en phase 7.1)
- Relations syndicats (SNE, régionaux)
- Partenariats experts-comptables spécialisés édition (prescripteurs naturels)
- Bouche-à-oreille client-témoin et premiers pilotes

**Offre Auteur** (B2C, ticket faible, volume) :
- **Contenu SEO français spécialisé** : blog couvrant les vraies questions tapées dans Google (« déclarer revenus auto-édition », « bilan annuel KDP France », « gérer ventes salon livre »). Audience qualifiée et durable, indépendante des algorithmes.
- Groupes Facebook actifs d'auteurs indépendants francophones
- Partenariats plateformes d'auto-édition (BoD, Bookelis, Librinova proposent des accords ressources)
- Podcasts auto-édition francophones (apparitions du fondateur et/ou de l'épouse)
- Instagram : secondaire, non prioritaire, volatil

**Principe général** : ne pas brûler de budget publicitaire tant que les canaux organiques n'ont pas été exploités. La pub payante a un impact limité sur ce marché de décideurs réfléchis.

---

## 5. Conformités réglementaires et juridiques — checklist opérationnelle

### 5.1 Facturation électronique (PA / ex-PDP)

**État du marché** : 117 Plateformes Agréées immatriculées au 26 mars 2026 (définitives ou sous réserve). Liste officielle sur impots.gouv.fr, mise à jour régulière.

**Critères de sélection** à appliquer à l'étude comparative :

1. **Ouverture aux intégrateurs tiers** : certaines PA sont des produits SaaS finaux (Pennylane, Sage, Cegid) qui vendent en direct et ne cherchent pas de partenaires. Viser plutôt des infrastructures techniques (Docaposte, Tenor, et d'autres plus orientées B2B tech).
2. **Tarification** : par facture (quelques centimes/facture) vs forfait + volume. Impact direct sur la marge.
3. **API documentée et stable** : tester en amont l'émission Factur-X, UBL, CII sans bricolage.
4. **Support partenaire** : existe-t-il un canal dédié aux intégrateurs ?
5. **Solidité financière** : privilégier les acteurs pérennes (filiales de grands groupes, acteurs déjà établis).
6. **Portabilité** : récupération de l'historique possible en cas de migration.

**Timing** : étude comparative et signature contrat technique à lancer **en parallèle** des entretiens utilisateurs (avril-juin 2026), pas après. Le délai d'intégration d'une PA est de plusieurs mois.

**Architecture** : abstraction technique obligatoire (cf. §3.4).

### 5.2 RGPD — double casquette responsable/sous-traitant

Le SaaS est simultanément :
- **Responsable de traitement** pour ses propres données : prospects, clients (contacts), utilisateurs du site.
- **Sous-traitant** pour les données que les clients éditeurs font transiter par l'outil : données de leurs auteurs, libraires, acheteurs en salon.

**Obligations opérationnelles** :

- **DPA (Data Processing Agreement)** dans les CGV : version standard + version négociable pour les clients qui poussent des ajustements
- **Registre des traitements** à créer dès le lancement et maintenir
- **Politique de confidentialité** détaillée et publique
- **Hébergement 100 % européen** (OVH, Scaleway, Clever Cloud)
- **Processus de notification des violations** de données en 72h à la CNIL (procédure écrite, testée)
- **Exercice des droits utilisateurs** : accès, rectification, suppression, **portabilité** (export complet dans format réutilisable — à coder dès le départ comme fonctionnalité native)
- **Chaîne de sous-sous-traitants** à déclarer dans le DPA : hébergeur, Stripe, SumUp, PA, service emailing, monitoring, etc. Autorisation écrite du client requise en cas de changement.

### 5.3 Contrats et documents juridiques

**Documents à produire avant lancement** :

1. **CGV SaaS** (conditions générales de vente)
2. **DPA** (annexe aux CGV ou document séparé)
3. **Politique de confidentialité** (publique sur le site)
4. **CGV boutique Auteur** (pour la v2, proposées aux auteurs comme modèle pour leur propre boutique)
5. **Mentions légales** du site et de l'application

**Approche recommandée pour maîtriser le budget** :

- Partir d'un **template sérieux** (Captain Contrat, Legalstart, ~300-500 €)
- Faire **relire par un avocat spécialisé** SaaS / droit du numérique (2-3 heures, 400-800 €)
- Focus de la relecture sur les clauses spécifiques à l'activité (cf. ci-dessous)

**Budget total réaliste** : **1 500 € tout compris** en étant efficace (pas 2 000-4 000 € comme estimation initiale).

**Points spécifiques nécessitant un regard d'avocat** (à ne pas laisser en générique) :

- Clause de sous-traitance RGPD reflétant l'infrastructure réelle
- Clause de limitation de responsabilité (exemple : plafond à 12 mois d'abonnement pour couvrir un bug provoquant préjudice client)
- Clause de réversibilité et portabilité (délai, format, périmètre)
- Clause de propriété intellectuelle (fondateur garde le code, client garde ses données, licence d'usage claire)
- Conditions spécifiques à l'émission de factures via PA mandataire (responsabilité technique vs responsabilité fiscale du client)

### 5.4 Dépôt INPI et protection de la marque

**Méthode rigoureuse** :

1. **Vérification d'antériorité poussée** avant dépôt :
   - Bases INPI (français) et EUIPO (européen)
   - Noms de domaine (.fr, .com, .eu disponibles et achat simultané)
   - Comptes réseaux sociaux disponibles (Instagram, LinkedIn, YouTube, TikTok, Facebook)
   - Concurrents francophones directs et indirects (Bookelis, BoD, Librinova, Publishroom, Crealo, etc.)

2. **Choix des classes Nice** : au minimum classes 9 (logiciels), 35 (services de gestion), 42 (SaaS, conception logicielle). Un dépôt incomplet ne protège pas.

3. **Timing critique** : déposer **avant** toute communication publique (site, brochure, salon). Une fois la marque exposée, n'importe qui peut la capter entre-temps.

4. **Achat simultané des noms de domaine** `.com` et `.fr` (coût marginal, protection essentielle).

---

## 6. Modèle économique — précisions

### 6.1 Rétention et switching cost

**Hypothèse validée** : un client Éditeur actif après 4-5 mois d'usage est un client durable sur plusieurs années. La combinaison saisie catalogue + historique + intégrations crée un coût de changement élevé qui stabilise naturellement le revenu récurrent.

**Mise en garde à internaliser** : le switching cost est un filet de sécurité, **pas une stratégie**. Le client doit rester parce qu'il est bien servi, jamais parce qu'il est coincé. Un client captif insatisfait :
- Ne recommande pas (or le bouche-à-oreille est le principal canal sur ce marché fermé)
- Part en masse dès qu'un concurrent propose une migration facilitée

**Indicateur à suivre trimestriellement** : taux de clients qui recommanderaient spontanément à un confrère. Si cette métrique baisse, le switching cost ne sauvera pas longtemps.

**Churn involontaire incompressible** : 5 à 10 % par an (fermetures, fusions, réductions d'activité). À intégrer dans les projections.

### 6.2 Paliers économiques

| Palier | MRR (tarif moyen mixte) | Observation |
|---|---|---|
| 50 clients | ~2 500-4 000 € | Activité secondaire, preuve de marché |
| 100 clients | ~6 000 € | Premier revenu principal potentiel (3 500-4 500 € net SASU) |
| 150 clients | ~9 000-10 500 € | Confort installé, épargne, réinvestissement |
| 250 clients | ~15 000-18 000 € | Question support mi-temps à poser |
| 500+ clients | 30 000+ € | Structure à embauches progressives |

Ces paliers s'entendent avec un mix des trois offres (Auteur à 5 €, Éditeur à 60 €, Éditeur + à 90-120 €).

### 6.3 Scénario de sortie explicité

**Posture du fondateur** :
- Priorité 1 : atteindre un niveau de vie correct, pas plus. Profil lifestyle business.
- Priorité 2 : si une opportunité de revente se présente, seuil de déclenchement **~1 M€**. Usage projeté : achat d'une maison comptant, placement du reste, vie orientée création + appui à la maison d'édition de l'épouse.

**Implications opérationnelles** de cette posture :

- **Choix techniques vers « propre plutôt que rapide »** : une revente suppose un audit technique par l'acquéreur. Dette technique minimale, documentation claire, tests sérieux.
- **Comptabilité impeccable dès le jour 1** : SASU avec expert-comptable dédié, écritures propres.
- **Propriété intellectuelle sans ambiguïté** : documenter explicitement que le code appartient au fondateur (voir §7.1).
- **Pas de levée de fonds** à ce stade : préserve la liberté de décision, évite la dilution, maintient la cohérence avec la cible lifestyle.
- **Option prêt d'honneur** (Initiative France / Réseau Entreprendre) cohérente : pas de prise au capital.

### 6.4 Configuration initiale — revenus complémentaires

Possibilité de dégager des revenus ponctuels à l'occasion :
- Forfait installation / onboarding (si option facturée retenue) : 200-400 € par client Éditeur
- Formations sur mesure (webinaires de groupe mensuels, puis sessions individuelles payantes à partir d'un certain volume)
- Import de gros catalogues (ex : maison d'édition migrant depuis Odoo) : forfait 300-600 € selon complexité

Non central, mais contribue à la trésorerie de démarrage.

---

## 7. Points de sécurisation additionnels

### 7.1 Propriété du code existant

**Situation** : code développé par le fondateur, sur son temps personnel, sur son serveur, sans rémunération par la maison d'édition de l'épouse.

**Action de sécurisation** (simple, gratuite, utile dans la durée) :
- Rédaction d'un document bref signé entre le fondateur et la structure juridique de la maison d'édition, confirmant :
  - Code propriété exclusive du fondateur
  - Usage par la maison d'édition en licence perpétuelle non-exclusive sans contrepartie financière jusqu'à ce jour
  - Absence de toute cession antérieure, implicite ou explicite
- Conservation du document (deux exemplaires signés).

Ce document protège contre toute complication future (évolution de la maison d'édition, associé, succession, vente).

### 7.2 Assurance responsabilité civile professionnelle

**Obligation de fait dès le premier client payant**. Couvre les dommages causés à un client par un dysfonctionnement de l'outil (perte de données, erreur de calcul, etc.).

**Budget** : environ 300-500 €/an pour un SaaS solo. À souscrire auprès d'un assureur spécialisé numérique (Hiscox, Stello, AXA Pro, etc.).

### 7.3 Sauvegardes et plan de reprise d'activité

**Exigences minimales** :
- Sauvegardes automatiques **quotidiennes** des bases de données
- Sauvegardes hebdomadaires complètes (base + fichiers + configurations)
- Stockage des sauvegardes **hors du serveur principal** (autre datacenter, autre fournisseur idéalement)
- **Test de restauration trimestriel** : une sauvegarde jamais testée n'existe pas
- **Plan de reprise documenté** : en cas de crash total, combien de temps pour remonter un service ? Procédure écrite accessible même depuis un téléphone en déplacement.
- **Chiffrement des sauvegardes** (RGPD)

Budget : inclus dans la plupart des offres d'hébergement cloud (OVH, Scaleway, Clever Cloud) ou ~20-50 €/mois en supplément.

### 7.4 Monitoring et alertes

**Outils à mettre en place avant le premier client** :

- **Monitoring d'uptime externe** : Better Uptime ou équivalent. Ping de santé toutes les 5 minutes, alerte immédiate si le service ne répond plus. Gratuit jusqu'à 10 monitors.
- **Error tracking** : Sentry ou équivalent pour capturer les erreurs backend et frontend. Plan gratuit suffit au démarrage.
- **Alertes canaux** : Slack, Telegram bot, ou SMS critiques. Ne pas se contenter d'emails (trop facile à louper).
- **Page statut publique** : `status.nomdusaas.fr` transparente sur les incidents en cours. Un client qui voit « incident en cours, résolution estimée 14h » ne panique pas. Un client sans information panique et saute sur le téléphone.

### 7.5 Observabilité et métriques produit

Dashboard interne minimal à consulter chaque matin :
- Clients actifs (par offre)
- MRR actuel vs mois précédent
- Nouveaux clients du jour
- Churn du mois
- Tickets support en attente, ouverts, résolus
- Taux de succès des jobs planifiés (synchros, imports, notifications)
- Erreurs serveur critiques des dernières 24h

Outil : tableau maison, Metabase, ou page privée admin dédiée. 1-2 jours de dev au départ, économie énorme en pilotage.

---

## 8. Roadmap produit — cadrage additionnel

### 8.1 Périmètre v1 (lancement commercial)

- Industrialisation multi-tenant (section 5.1 du cadrage initial)
- Intégration PA facturation électronique (abstraite)
- Module conformité caisse (4 conditions documentées)
- Garde-fou prix unique
- Export comptable (FEC + API Pennylane)
- Intégration SumUp (v1 : un fournisseur, extensible)
- Tutoriel mascotte embarqué
- PWA avec installation bureau
- App mobile salon avec synchronisation offline (cf. §3.2)
- **Scan de codes-barres ISBN/EAN** (app mobile salon et app web éditeur) pour saisie rapide de catalogue et enregistrement de vente en salon (cf. §3.7)
- **Rattachement d'auteurs à une ME** (offre Éditeur + salon) : qualification stock ME / stock propre, permissions fines, doubles espaces caisse
- Site vitrine + brochure + vidéo démo + bac à sable pré-rempli

### 8.2 v1.5 (3 mois après lancement v1)

- Modèles de configuration pré-remplis par profil d'éditeur
- Documentation support enrichie selon retours premiers clients
- Import CSV multi-plateformes pour offre Auteur (KDP, Kobo, Bookelis, BoD, Librinova)
- Intégration Tiime en complément de Pennylane
- Monitoring interne des métriques métier consolidé

### 8.3 v2 (6 mois après lancement v1)

- **Boutique Auteur avec QR code et paiement Stripe Connect direct**
- Sous-domaines inclus + support domaines personnels via CNAME
- Notifications multi-canal sur ventes boutique (push + email + dashboard)
- Offre « Auteur + » à tarif intermédiaire intégrant la boutique
- Extension multi-fournisseurs encaissement (Zettle, Stripe Reader en complément SumUp)

### 8.4 Horizons plus lointains (à parquer, à ne pas oublier)

- Expansion francophone (Belgique, Suisse, Québec) : spécificités fiscales à auditer avant
- Verticales adjacentes : maisons de disques indépendantes, ateliers d'artistes, petits producteurs culturels
- Place de marché aux droits (horizon 3-5 ans, à réévaluer selon base installée)

### 8.5 Éléments étudiés et écartés

- **Cron jobs de notifications automatiques de ventes multi-plateformes (KDP, Kobo)** : techniquement faisable mais dépend d'API inexistantes ou de scraping instable. Écarté au profit de l'import CSV manuel régulier (chemin A), robuste et sans dépendance.
- **Domaine personnel revendu par le SaaS** : écarté, impliquerait de devenir registrar ou revendeur, métier distinct à marges faibles et support chronophage. Remplacé par l'acceptation de domaines apportés par l'utilisateur (CNAME).
- **Application desktop packagée (Electron/Tauri)** : écartée au profit du web pur + PWA.

---

## 9. Journal des décisions fortes — référence rapide

Liste consolidée des décisions tranchées, à garder sous les yeux en cas de tentation de changement :

1. **Code unique pour tous, pas de développement spécifique par client.**
2. **Configuration initiale personnalisée, oui ; code personnalisé, jamais.**
3. **Pas de commission sur les ventes de la boutique Auteur.**
4. **Pas de rôle de registrar / revendeur de domaines.**
5. **Architecture web pure, pas de desktop packagé.**
6. **Intégration PA via couche d'abstraction, pas de dépendance dure.**
7. **Offre Auteur strictement auto-servie, support email minimal.**
8. **Abonnement annuel privilégié par onboarding offert.**
9. **Trois formules au lancement, pas plus.**
10. **Dépôt INPI avant toute communication publique.**
11. **Template juridique + relecture avocat, pas tout en sur-mesure.**
12. **App mobile salon native, poste bureau en PWA.**
13. **UUIDs générés côté client, API serveur idempotente.**
14. **Monitoring et observabilité opérationnels avant le premier client.**
15. **Scénario de sortie explicité : lifestyle prioritaire, revente si ~1 M€.**
16. **Auteur rattaché sans abonnement : ne voit que les livres confiés par la ME, rien de plus.**
17. **ME : accès aux ventes de ses auteurs uniquement pour les livres dont elle est éditrice.**
18. **Séparation stricte des permissions ME / auteur, non négociable (protection juridique et vie privée).**
19. **Scan codes-barres ISBN/EAN en v1** (mobile + web + douchette HID), avec abstraction du fournisseur de métadonnées bibliographiques.
20. **Stack technique validée** : Node.js + TypeScript (back), React + TypeScript + Vite + PWA (web), React Native + Expo (mobile), PostgreSQL + Prisma, monorepo avec logique métier partagée.

---

## 10. Actions immédiates dérivées de cette synthèse

À ajouter à la feuille de route opérationnelle initiale (section 7 du cadrage principal) :

**Phase avril-juin 2026 (en complément de la phase 7.1 existante)** :

- Vérification d'antériorité marque + dépôt INPI + achat domaines `.com` / `.fr`
- Étude comparative Plateformes Agréées avec critères formalisés (§5.1) et pré-sélection 2-3 candidats
- Audit du code existant contre les 4 conditions de la loi anti-fraude TVA 2018
- Rédaction du document de sécurisation de propriété intellectuelle (signature avec maison d'édition épouse)
- Brief avocat spécialisé (template CGV/DPA/Confidentialité + points de relecture spécifiques)
- Souscription RC Pro à anticiper pour le premier client

**Phase juillet-octobre 2026 (en complément de la phase 7.2 existante)** :

- Conception de la mascotte et scénarisation des tutoriels embarqués
- Mise en place infrastructure observabilité (monitoring, error tracking, page statut)
- Processus de sauvegarde et test de restauration opérationnels
- Architecture synchronisation offline implémentée et testée en conditions réelles de salon
- Mise en place du dashboard métier interne

---

*Document compagnon — Version 1.0 — Avril 2026.*
*À relire avant chaque décision structurante. À mettre à jour au fil de l'exécution.*
