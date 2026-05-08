
**Auteur :** Ajouté si auteur en contrat chez nous. Sela sera directement lié avec les contrats édités via la système. => En partie fait, reste l'éditeur de contrat en ligne.


Attention : Penser au niveau d'abonnement et l'activation ou la désectivation des options.

Attention : Penser au crédit pour les factures. Comme elles sont payantes, on ne peut pas laisser les users envoyer autant de factures qu'ils le souhaiente. On doit donc attribuer des crédits.




**Droits auteurs !** Quand un paiement est en retard, la date de prochaine échéance doit rester celle du retard, pas la prochaine. Et bien indiquer le retard.
Pour les references de paiement : Créer une référence unique par contre : initialAuteur-4premiercaracterelivre-annee-numeroOrdrePaiement
Il ne sera pas éditable.



**Catalogue :** Corriger le bugs avec les images prises depuis l'app.

**Dans les articles :** Ajout d'un bouton pour upload une image d'illustration. Cette image sera converti en thumbnail pour l'app mobile. on réduit la taille de l'image uploader pour un besoin qui se limite à l'affichage d'une illustration dans la liste des articles. On surveille que le client de flood pas les uploads. Conserver l'ajour d'image par url. Une upload renseignera le champs url.



En test pré-prod :
 Le fix noImplicitAny: false est pragmatique pour la pré-prod — le code fonctionne, c'est juste du typage implicite non déclaré dans les
  callbacks. À corriger proprement plus tard, pas maintenant.


_________________________________________

---

## Chantier A — Gating par plan d'abonnement

### Plans

| | Auto-édition | Edition | Edition Pro |
|---|---|---|---|
| Articles actifs max | 20 | 40 | Illimité |
| Caisse / PDV / Stocks | ✓ | ✓ | ✓ |
| Salons | ✓ | ✓ | ✓ |
| Statistiques de ventes (`/statistiques_de_vente`) | ✓ | ✓ | ✓ |
| Réglages | ✓ | ✓ | ✓ |
| Auteurs (réseau, lecture seule) | ✓ réseau | ✓ complet | ✓ complet |
| Contrats / Droits d'auteur | ✗ | ✓ | ✓ |
| Dépôts libraires | ✗ | ✓ | ✓ |
| Facturation électronique 2026 | ✗ | ✓ | ✓ |
| Export CSV/PDF | ✗ | ✓ | ✓ |
| Comptes utilisateurs | 1 | 3 | 10 |
| Support | Documentation | Email | Prioritaire |

Le plan TRIAL = Edition complet pendant 30 jours, bascule en Auto-édition sans abonnement.

### Comportement du switch Auteurs en Auto-édition
Le switch "Gestion complète" est désactivé. Au survol : *"Cette fonctionnalité est disponible à partir du plan Edition. Passez à Edition pour gérer vos contrats et droits d'auteur."*

### Downgrade de plan
On ne supprime jamais de données. Règles à appliquer via `handlePlanDowngrade(tenantId, ancienPlan, nouveauPlan)` :
- Articles au-delà du quota → statut `archivé` (inactifs dans la caisse). Bandeau UI : *"X articles archivés suite au changement de plan. Choisissez lesquels réactiver ou upgradez."*
- Contrats et droits d'auteur → lecture seule jusqu'au prochain upgrade
- Utilisateurs surnuméraires → accès suspendu (pas supprimés)

### Auteur virtuel (Auto-édition)
Création **lazy** : l'auteur virtuel n'est pas créé à l'ouverture du compte. Il est créé automatiquement à la première occasion qui en a besoin (premier article créé, première consultation de la section Auteurs) en utilisant les informations du compte tenant (nom, email).
- Flag `isVirtuel: true` sur le modèle `Auteur`
- Les nouveaux articles lui sont assignés automatiquement sans interaction de l'utilisateur
- La section Auteurs affiche cet auteur en lecture seule avec la mention *"Votre profil auteur"*
- Un article archivé par downgrade peut être "reconverti" : l'utilisateur clique *"Je suis l'auteur de ce livre"* → l'auteur virtuel lui est assigné → l'article est réactivé dans le quota

### Architecture technique
- `PlanType` enum à mettre à jour : `TRIAL | AUTO_EDITION | EDITION | EDITION_PRO`
- Fichier central `packages/shared/src/planFeatures.ts` définissant les droits par plan
- Backend : middleware `requirePlanFeature(feature)` + vérification quota articles sur `POST /articles`
- Frontend : hook `usePlanFeatures()` + composant `<FeatureGate feature="...">` avec tooltip d'upgrade
- Renommer la route `/comptabilite` en `/statistiques_de_vente`

---

## Chantier B — Réseau cross-tenant auteur/ME (Edition Pro uniquement)

> ⚠️ Ne pas commencer avant que le plan Edition Pro soit en production et que la base de clients soit établie.

### Concept
Un auteur avec son propre compte (plan Auto-édition ou Edition) peut vendre des livres de Maisons d'Edition tierces qui lui ont assigné des articles. Les deux tenants sont distincts.

### Flux
1. La ME invite un auteur par email depuis le back-office
2. L'auteur accepte → une liaison cross-tenant est créée
3. L'app mobile de l'auteur affiche : ses propres articles + les articles assignés par les MEs (en lecture seule, hors quota)
4. Vente d'un article ME → le CA va dans le tenant ME, l'auteur reçoit ses droits d'auteur
5. Le bilan de l'auteur distingue : son propre CA / ses DA provenant de MEs

### Impact architectural
- Nouveau modèle `CrossTenantAssignment` (articleId ME, tenantId auteur, taux DA)
- La vente cross-tenant enregistre le CA sous le tenant ME et un reversement DA sous le tenant auteur
- Le bilan auteur doit agréger deux sources : son propre tenant + ses DA inter-tenants
- L'isolation multi-tenant actuelle doit être étendue pour autoriser ces lectures croisées contrôlées

---

Pour ne pas oublier pour plus tard :
- **Plateforme de réception des soumissions auteurs** : Depuis leur interface, les ME pourront ouvrir des recrutement d'auteurs en déposant une annonce (avec des critères comme public cible, style, etc...)
- Des illustrateurs pourront également être recruté par annonce.

- **Le site vitrine** deviendra également un lieu incontournable pour promouvoir les salons et évènements litéraire. Les ME pourront directement importés ces salon dans leur réseau et point de vente.





