/**
 * Script de migration one-shot : EVA → MeGesti
 *
 * Lit les JSON + images dans /export-eva/ et injecte tout dans le tenant unique.
 *
 * Exécution (depuis apps/api) :
 *   tsx --env-file=.env scripts/migrate-eva.ts
 *
 * À supprimer après migration.
 */

import { PrismaClient }        from '@prisma/client';
import { readFileSync }        from 'fs';
import { copyFile, mkdir }     from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { existsSync }          from 'fs';
import { fileURLToPath }       from 'url';

const prisma = new PrismaClient();

const __scriptDir = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR  = join(__scriptDir, '../../../export-eva');
const UPLOAD_DIR  = process.env['UPLOAD_DIR'] ?? join(process.cwd(), 'uploads');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function load<T>(name: string): T[] {
  const raw = JSON.parse(readFileSync(join(EXPORT_DIR, `${name}.json`), 'utf-8'));
  return raw === null ? [] : (raw as T[]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Mappings EVA → MeGesti ──────────────────────────────────────────────────

const METHODE_PAIEMENT: Record<number, string> = {
  1: 'ESPECES',
  2: 'CB',
  3: 'CHEQUE',
  4: 'VIREMENT',
  5: 'CB',   // PayPal → CB (pas d'équivalent exact)
  7: 'CB',   // Lydia → CB (pas d'équivalent exact)
};

const TYPE_FRAIS: Record<number, string> = {
  1: 'DEPLACEMENT',   // Transport
  2: 'HEBERGEMENT',   // Hébergement
  3: 'REPAS',         // Restauration
  4: 'AUTRE',         // Matériel
  5: 'AUTRE',         // Impression
  6: 'AUTRE',         // Autre
};

// Catégories EVA → rayon "Livres" ; les autres → "Produits dérivés"
const LIVRES_CAT_IDS = new Set([1, 4, 9, 10, 11]); // Roman, Jeunesse, Nouvelle, Poésie, Essai

// ─── Types JSON EVA ──────────────────────────────────────────────────────────

interface EvaCategorie  { id: number; nom: string }
interface EvaProduit {
  id: number; nom: string; categorieId: number; prixVenteTTC: number;
  cout: number; tva: number; stock: number; stockAlerte: number;
  actif: number; description: string | null; imageUrl: string | null;
}
interface EvaAuteur     { id: number; nom: string; prenom: string; email: string | null }
interface EvaAuteurProd { auteurId: number; produitId: number }
interface EvaTypePDV    { id: number; nom: string }
interface EvaPDV {
  id: number; nom: string; typePDVId: number; adresse: string | null; ville: string | null;
  commissionFixe: number; commissionPourcent: number; typeEncaissement: string; actif: number;
}
interface EvaSession {
  id: number; pointDeVenteId: number; debut: number; fin: number | null; statut: string;
}
interface EvaVente {
  id: number; sessionId: number; methodePaiementId: number; annulee: number;
  createdAt: number; type: string;
}
interface EvaLigne {
  id: number; venteId: number; produitId: number;
  prixUnitaire: number; quantite: number; remise: number;
}
interface EvaFrais {
  id: number; sessionId: number; libelle: string; montant: number;
  typeFraisId: number; createdAt: number;
}

// ─── Images ──────────────────────────────────────────────────────────────────

/**
 * Copie l'image EVA vers la structure megesti :
 *   uploads/articles/{articleId}/thumb_web.jpg  (depuis produits/)
 *   uploads/articles/{articleId}/thumb_app.jpg  (depuis thumbs/)
 *
 * Retourne l'imageUrl megesti, ou null si aucune image disponible.
 */
async function copyImageProduit(
  evaImageUrl: string | null,
  articleId: string,
): Promise<string | null> {
  if (!evaImageUrl) return null;

  // Extraire le nom de fichier : /uploads/produits/produit-1-1234.jpg → produit-1-1234.jpg
  const filename = basename(evaImageUrl);
  const srcWeb   = join(EXPORT_DIR, 'produits', filename);
  const srcApp   = join(EXPORT_DIR, 'thumbs',   filename);

  if (!existsSync(srcWeb) && !existsSync(srcApp)) {
    console.warn(`     ⚠  Image introuvable pour ${filename}`);
    return null;
  }

  const destDir = join(UPLOAD_DIR, 'articles', articleId);
  await mkdir(destDir, { recursive: true });

  if (existsSync(srcWeb)) await copyFile(srcWeb, join(destDir, 'thumb_web.jpg'));
  if (existsSync(srcApp)) await copyFile(srcApp, join(destDir, 'thumb_app.jpg'));

  return `/api/uploads/articles/${articleId}/thumb_web.jpg`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Migration EVA → MeGesti             ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`UPLOAD_DIR : ${UPLOAD_DIR}\n`);

  // ── 0. Tenant ──────────────────────────────────────────────────────────────

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('Aucun tenant trouvé. Créer le compte avant de migrer.');
  const tenantId = tenant.id;
  console.log(`Tenant : ${tenant.name} (${tenantId})`);

  if (!tenant.franchiseTva) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { franchiseTva: true },
    });
    console.log('→ franchiseTva mis à true sur le tenant\n');
  } else {
    console.log('→ franchiseTva déjà à true\n');
  }

  // ── Chargement JSON ────────────────────────────────────────────────────────

  const evaCategories   = load<EvaCategorie>('Categorie');
  const evaProduits     = load<EvaProduit>('Produit');
  const evaAuteurs      = load<EvaAuteur>('Auteur');
  const evaAuteurProds  = load<EvaAuteurProd>('AuteurProduit');
  const evaTypePDV      = load<EvaTypePDV>('TypePDV');
  const evaPDVs         = load<EvaPDV>('PointDeVente');
  const evaSessions     = load<EvaSession>('Session');
  const evaVentes       = load<EvaVente>('Vente');
  const evaLignes       = load<EvaLigne>('LigneVente');
  const evaFrais        = load<EvaFrais>('Frais');

  console.log(`Données chargées :
  - ${evaCategories.length} catégories
  - ${evaProduits.length} produits
  - ${evaAuteurs.length} auteurs / ${evaAuteurProds.length} liaisons
  - ${evaTypePDV.length} types PDV / ${evaPDVs.length} points de vente
  - ${evaSessions.length} sessions
  - ${evaVentes.length} ventes / ${evaLignes.length} lignes
  - ${evaFrais.length} frais\n`);

  // Tables de correspondance : ancien ID entier → UUID megesti
  const categorieMap = new Map<number, string>();
  const rayonMap     = new Map<string, string>();   // nom → uuid
  const produitMap   = new Map<number, string>();
  const auteurMap    = new Map<number, string>();
  const typePDVMap   = new Map<number, string>();
  const pdvMap       = new Map<number, string>();
  const sessionMap   = new Map<number, string>();

  // ── 1. Rayons ─────────────────────────────────────────────────────────────

  console.log('── [1/10] Rayons');
  for (const r of [
    { nom: 'Livres',           tauxTVA: 5.5 },   // taux théorique (franchise TVA active)
    { nom: 'Produits dérivés', tauxTVA: 20  },
  ]) {
    const rayon = await prisma.rayon.upsert({
      where:  { tenantId_nom: { tenantId, nom: r.nom } },
      create: { tenantId, nom: r.nom, tauxTVA: r.tauxTVA },
      update: {},
    });
    rayonMap.set(r.nom, rayon.id);
    console.log(`   "${r.nom}" → ${rayon.id}`);
  }

  // ── 2. Catégories ─────────────────────────────────────────────────────────

  console.log('\n── [2/10] Catégories');
  for (const cat of evaCategories) {
    const rayonNom = LIVRES_CAT_IDS.has(cat.id) ? 'Livres' : 'Produits dérivés';
    const rayonId  = rayonMap.get(rayonNom)!;
    const c = await prisma.categorie.upsert({
      where:  { rayonId_nom: { rayonId, nom: cat.nom } },
      create: { tenantId, rayonId, nom: cat.nom },
      update: {},
    });
    categorieMap.set(cat.id, c.id);
    console.log(`   [${cat.id}] ${cat.nom} (${rayonNom}) → ${c.id}`);
  }

  // ── 3. Auteurs ────────────────────────────────────────────────────────────

  console.log('\n── [3/10] Auteurs');
  for (const a of evaAuteurs) {
    const auteur = await prisma.auteur.create({
      data: { tenantId, prenom: a.prenom, nom: a.nom, email: a.email, actif: true },
    });
    auteurMap.set(a.id, auteur.id);
    console.log(`   [${a.id}] ${a.prenom} ${a.nom} → ${auteur.id}`);
  }

  // ── 4. Articles + Images ──────────────────────────────────────────────────

  console.log('\n── [4/10] Articles & images');
  const evaCatById = new Map(evaCategories.map(c => [c.id, c]));
  let imagesCopiees = 0;

  for (const p of evaProduits) {
    const categorieId = categorieMap.get(p.categorieId);
    if (!categorieId) {
      console.warn(`   ⚠  Produit ${p.id} "${p.nom}" : catégorie ${p.categorieId} inconnue — ignoré`);
      continue;
    }
    const cat      = evaCatById.get(p.categorieId)!;
    const rayonNom = LIVRES_CAT_IDS.has(cat.id) ? 'Livres' : 'Produits dérivés';
    const rayonId  = rayonMap.get(rayonNom)!;

    // Franchise TVA : prixVenteTTC = prixVenteHT (aucune TVA collectée)
    const prixVenteHT = p.prixVenteTTC;

    const article = await prisma.article.create({
      data: {
        tenantId,
        rayonId,
        categorieId,
        nom:         p.nom,
        description: p.description,
        prixVenteHT,
        prixAchatHT: p.cout > 0 ? p.cout : null,
        stock:       p.stock,
        stockAlerte: p.stockAlerte,
        actif:       p.actif === 1,
      },
    });

    // Copier les images et mettre à jour imageUrl
    const imageUrl = await copyImageProduit(p.imageUrl, article.id);
    if (imageUrl) {
      await prisma.article.update({
        where: { id: article.id },
        data:  { imageUrl },
      });
      imagesCopiees++;
    }

    produitMap.set(p.id, article.id);
    console.log(`   [${p.id}] "${p.nom}"${imageUrl ? ' 🖼' : ''} → ${article.id}`);
  }
  console.log(`   → ${imagesCopiees} images copiées`);

  // ── 5. ArticleAuteur ──────────────────────────────────────────────────────

  console.log('\n── [5/10] Liaisons Articles ↔ Auteurs');
  for (const ap of evaAuteurProds) {
    const articleId = produitMap.get(ap.produitId);
    const auteurId  = auteurMap.get(ap.auteurId);
    if (!articleId || !auteurId) {
      console.warn(`   ⚠  Liaison auteur ${ap.auteurId} ↔ produit ${ap.produitId} : entité manquante — ignorée`);
      continue;
    }
    await prisma.articleAuteur.upsert({
      where:  { articleId_auteurId: { articleId, auteurId } },
      create: { articleId, auteurId },
      update: {},
    });
    console.log(`   produit ${ap.produitId} ↔ auteur ${ap.auteurId}`);
  }

  // ── 6. CategoriesPointDeVente (TypePDV) ───────────────────────────────────

  console.log('\n── [6/10] Catégories Point de Vente');
  for (const t of evaTypePDV) {
    const c = await prisma.categoriePointDeVente.upsert({
      where:  { tenantId_nom: { tenantId, nom: t.nom } },
      create: { tenantId, nom: t.nom },
      update: {},
    });
    typePDVMap.set(t.id, c.id);
    console.log(`   [${t.id}] ${t.nom} → ${c.id}`);
  }

  // ── 7. Points de Vente ────────────────────────────────────────────────────

  console.log('\n── [7/10] Points de Vente');
  for (const p of evaPDVs) {
    const categorieId = typePDVMap.get(p.typePDVId);
    const pdv = await prisma.pointDeVente.create({
      data: {
        tenantId,
        categorieId,
        nom:               p.nom,
        commissionFixe:    p.commissionFixe    > 0 ? p.commissionFixe    : null,
        commissionPourcent: p.commissionPourcent > 0 ? p.commissionPourcent : null,
        encaissementDirect: p.typeEncaissement === 'nous',
        actif:             p.actif === 1,
      },
    });
    pdvMap.set(p.id, pdv.id);
    console.log(`   [${p.id}] "${p.nom}" → ${pdv.id}`);
  }

  // ── 8. Sessions ───────────────────────────────────────────────────────────

  console.log('\n── [8/10] Sessions');
  for (const s of evaSessions) {
    const pointDeVenteId = pdvMap.get(s.pointDeVenteId);
    if (!pointDeVenteId) {
      console.warn(`   ⚠  Session ${s.id} : PDV ${s.pointDeVenteId} inconnu — ignorée`);
      continue;
    }
    const session = await prisma.sessionCaisse.create({
      data: {
        tenantId,
        pointDeVenteId,
        dateOuverture: new Date(s.debut),
        dateFermeture: s.fin ? new Date(s.fin) : null,
        statut:        s.statut === 'cloturee' ? 'FERMEE' : 'OUVERTE',
        fondOuverture: 0,
      },
    });
    sessionMap.set(s.id, session.id);
    console.log(`   [${s.id}] PDV ${s.pointDeVenteId} → ${session.id}`);
  }

  // ── 9. Ventes + Lignes ────────────────────────────────────────────────────

  console.log('\n── [9/10] Ventes et Lignes');

  // Index lignes par venteId
  const lignesByVente = new Map<number, EvaLigne[]>();
  for (const l of evaLignes) {
    if (!lignesByVente.has(l.venteId)) lignesByVente.set(l.venteId, []);
    lignesByVente.get(l.venteId)!.push(l);
  }

  // Partir après le dernier numéro existant (sécurité si migration rejouée)
  const lastVente = await prisma.vente.findFirst({
    where:   { tenantId },
    orderBy: { numero: 'desc' },
    select:  { numero: true },
  });
  let venteNumero = (lastVente?.numero ?? 0) + 1;
  if (venteNumero > 1) console.log(`   (reprise à partir du numéro ${venteNumero})`);

  const sortedVentes = [...evaVentes].sort((a, b) => a.createdAt - b.createdAt);

  for (const v of sortedVentes) {
    const sessionId = sessionMap.get(v.sessionId);
    if (!sessionId) {
      console.warn(`   ⚠  Vente ${v.id} : session ${v.sessionId} inconnue — ignorée`);
      continue;
    }

    const modePaiement = METHODE_PAIEMENT[v.methodePaiementId] ?? 'ESPECES';
    const lignes       = lignesByVente.get(v.id) ?? [];

    type LigneBuild = {
      articleId:      string;
      quantite:       number;
      prixUnitaireHT: number;   // = prixUnitaire (franchise TVA, pas de TVA collectée)
      tauxTVA:        number;   // 0 (franchise TVA)
      totalLigneHT:   number;
      totalLigneTTC:  number;   // = totalLigneHT
    };

    const lignesData: LigneBuild[] = [];
    let totalTTC = 0;

    for (const l of lignes) {
      const articleId = produitMap.get(l.produitId);
      if (!articleId) {
        console.warn(`     ⚠  Ligne ${l.id} : article ${l.produitId} inconnu — ligne ignorée`);
        continue;
      }
      // Franchise TVA : prixUnitaire TTC = HT, tauxTVA = 0
      const prixEffectif = round2(l.prixUnitaire * (1 - l.remise / 100));
      const ligneTTC     = round2(prixEffectif * l.quantite);

      totalTTC += ligneTTC;

      lignesData.push({
        articleId,
        quantite:       l.quantite,
        prixUnitaireHT: prixEffectif,
        tauxTVA:        0,
        totalLigneHT:   ligneTTC,   // HT = TTC en franchise
        totalLigneTTC:  ligneTTC,
      });
    }

    totalTTC = round2(totalTTC);

    const vente = await prisma.vente.create({
      data: {
        tenantId,
        sessionId,
        numero:       venteNumero++,
        dateVente:    new Date(v.createdAt),
        modePaiement: modePaiement as any,
        totalHT:      totalTTC,   // HT = TTC en franchise
        totalTVA:     0,
        totalTTC,
        statut:       v.annulee === 1 ? 'ANNULEE' : 'VALIDEE',
        createdAt:    new Date(v.createdAt),
        lignes: { create: lignesData },
      },
    });

    console.log(`   [${v.id}] #${vente.numero}${v.annulee ? ' (ANNULEE)' : ''} → ${vente.id}`);
  }

  // ── 10. Frais ─────────────────────────────────────────────────────────────

  console.log('\n── [10/10] Frais');
  for (const f of evaFrais) {
    const sessionId = sessionMap.get(f.sessionId);
    if (!sessionId) {
      console.warn(`   ⚠  Frais ${f.id} : session ${f.sessionId} inconnue — ignoré`);
      continue;
    }
    const type = TYPE_FRAIS[f.typeFraisId] ?? 'AUTRE';
    await prisma.frais.create({
      data: {
        tenantId,
        sessionId,
        type:      type as any,
        motif:     f.libelle,
        montantHT: f.montant,    // frais : pas de TVA à déduire (franchise TVA)
        date:      new Date(f.createdAt),
        createdAt: new Date(f.createdAt),
      },
    });
    console.log(`   [${f.id}] "${f.libelle}" (${type})`);
  }

  // ── Résumé ────────────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  ✅  Migration terminée avec succès  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`
Inséré :
  - ${rayonMap.size} rayons
  - ${categorieMap.size} catégories
  - ${auteurMap.size} auteurs
  - ${produitMap.size} articles (${imagesCopiees} avec image)
  - ${typePDVMap.size} catégories PDV
  - ${pdvMap.size} points de vente
  - ${sessionMap.size} sessions
  - ${venteNumero - 1} ventes (+ lignes)
  - ${evaFrais.length} frais

Notes :
  - franchiseTva = true sur le tenant
  - tauxTVA = 0 sur toutes les lignes de vente (franchise TVA)
  - Hash/previousHash = null sur les ventes importées : la chaîne
    anti-fraude démarrera à la première vente saisie dans MeGesti
`);
}

main()
  .catch(e => {
    console.error('\n❌ ERREUR :\n', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
