import type { PrismaClient } from '@prisma/client'

/** Modèles multi-tenant référençables par FK dans les payloads clients. */
type OwnedModel =
  | 'rayon' | 'categorie' | 'auteur' | 'imprimeur' | 'article'
  | 'typeDA' | 'contratAuteur' | 'sessionCaisse' | 'categoriePointDeVente'
  | 'typeSalon' | 'customFieldDefinition' | 'pointDeVente' | 'salon'
  | 'maisonEdition' | 'depotLibraire' | 'motifVente' | 'thesaurus'

/**
 * Vérifie que chaque id référencé appartient bien au tenant courant.
 * Lance un 400 sinon — empêche de lier une ressource d'un autre tenant
 * (et d'en lire les données via les include des réponses).
 * Les valeurs null/undefined sont ignorées (FK optionnelles).
 */
export async function assertTenantOwned(
  db: PrismaClient,
  model: OwnedModel,
  ids: (string | null | undefined)[] | string | null | undefined,
  tenantId: string,
): Promise<void> {
  const list = (Array.isArray(ids) ? ids : [ids]).filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (list.length === 0) return
  const unique = [...new Set(list)]
  // Indexation dynamique des delegates Prisma : le typage générique exact
  // n'est pas exprimable sans un mapping lourd, tous ces modèles ont bien
  // { id, tenantId } (garanti par le type OwnedModel ci-dessus).
  const delegate = db[model] as unknown as { count: (args: { where: { id: { in: string[] }; tenantId: string } }) => Promise<number> }
  const count = await delegate.count({ where: { id: { in: unique }, tenantId } })
  if (count !== unique.length) {
    const err = new Error(`Référence invalide (${model})`) as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }
}
