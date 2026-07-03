import { useState, useEffect, useCallback } from 'react'
import { getDb, generateUUID } from '@/lib/db'
import { api } from '@/lib/api'
import { Config } from '@/constants/Config'
import { useDevStore } from '@/store/devStore'

export interface LocalArticle {
  id: string
  nom: string
  reference: string | null
  image_url: string | null
  thumb_app_url: string | null
  prix_achat_ht: number | null
  prix_vente_ht: number
  taux_tva: number
  stock_local: number
  stock_alerte: number
  rayon_nom: string | null
  categorie_id: string | null
  categorie_nom: string | null
  isbn: string | null
  vendable: number  // 1 = vendable, 0 = matière première
  actif: number
}

interface ApiArticle {
  id: string
  nom: string
  reference: string | null
  imageUrl: string | null
  prixVenteHT: number
  prixAchatHT: number | null
  vendable: boolean
  rayon: { nom: string; tauxTVA: number; isMatieresPremiere: boolean }
  categorie: { id: string; nom: string } | null
  isbn: string | null
  stock: number
  stockAlerte: number
  actif: boolean
}

interface UploadResponse {
  thumbAppUrl: string
  thumbWebUrl: string
}

/** Rayon tel que renvoyé par GET /rayons (avec catégories imbriquées). */
export interface Rayon {
  id: string
  nom: string
  ordre: number
  isLibrairie: boolean
  tauxTVA: number
  categories: { id: string; nom: string; ordre: number }[]
}

/** Charge les rayons du tenant (avec catégories imbriquées) — pour les formulaires. */
export async function fetchRayons(): Promise<Rayon[]> {
  return api.get<Rayon[]>('/rayons')
}

/** Payload de création d'article (champs utiles salon — version simplifiée du web). */
export interface CreateArticleInput {
  rayonId: string
  categorieId?: string | null
  nom: string
  isbn?: string | null
  prixVenteHT: number
  prixAchatHT?: number | null
  stock?: number
}

/** URL complète depuis un chemin relatif ou absolu renvoyé par l'API.
 *  Dérive la racine du serveur depuis apiBaseUrl (enlève /api final). */
function fullUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const base = Config.apiBaseUrl.replace(/\/api\/?$/, '')
  return `${base}${path}`
}

export function useLocalArticles(ids?: string[], includeNonVendable = false) {
  const [articles, setArticles] = useState<LocalArticle[]>([])
  const [loading, setLoading] = useState(true)
  const addLog = useDevStore(s => s.addLog)

  const refresh = useCallback(async () => {
    const db = await getDb()
    let rows: LocalArticle[]
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      rows = await db.getAllAsync<LocalArticle>(
        `SELECT * FROM articles WHERE id IN (${placeholders}) ORDER BY nom ASC`,
        ids,
      )
    } else {
      const vendableClause = includeNonVendable ? '' : 'AND vendable = 1'
      rows = await db.getAllAsync<LocalArticle>(
        `SELECT * FROM articles WHERE actif = 1 ${vendableClause} ORDER BY nom ASC`,
      )
    }
    setArticles(rows)
    setLoading(false)
  }, [ids?.join(','), includeNonVendable])

  useEffect(() => { refresh() }, [refresh])

  const pullFromServer = useCallback(async (articleIds?: string[]): Promise<string[]> => {
    try {
      const data = await api.get<ApiArticle[]>('/articles?actif=true&take=500')
      const db = await getDb()
      const filtered = articleIds ? data.filter(a => articleIds.includes(a.id)) : data

      // Vider la table avant de la repeupler = source de vérité serveur
      await db.execAsync('DELETE FROM articles')

      for (const a of filtered) {
        const imageUrl = fullUrl(a.imageUrl)
        const thumbAppUrl = imageUrl?.replace('thumb_web', 'thumb_app') ?? null

        const vendable = (a.vendable && !a.rayon.isMatieresPremiere) ? 1 : 0
        await db.runAsync(
          `INSERT OR REPLACE INTO articles
            (id, nom, reference, image_url, thumb_app_url, prix_vente_ht, prix_achat_ht, taux_tva,
             stock_local, stock_alerte, rayon_nom, categorie_id, categorie_nom, isbn, vendable, actif)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [a.id, a.nom, a.reference, imageUrl, thumbAppUrl,
           Number(a.prixVenteHT), a.prixAchatHT != null ? Number(a.prixAchatHT) : null, Number(a.rayon.tauxTVA),
           a.stock, a.stockAlerte ?? 0,
           a.rayon.nom, a.categorie?.id ?? null, a.categorie?.nom ?? null, a.isbn, vendable],
        )
      }
      addLog('info', `${filtered.length} articles téléchargés`)
      await refresh()
      return filtered.map(a => a.id)
    } catch (e: any) {
      addLog('error', `Échec pull articles: ${e?.message}`)
      return []
    }
  }, [refresh, addLog])

  const updateStock = useCallback(async (articleId: string, stock: number) => {
    const db = await getDb()
    await db.runAsync('UPDATE articles SET stock_local = ? WHERE id = ?', [stock, articleId])
    await refresh()
    api.patch(`/articles/${articleId}`, { stock }).catch(() => {})
  }, [refresh])

  const uploadImage = useCallback(async (articleId: string, imageUri: string): Promise<string | null> => {
    addLog('info', `[uploadImage] Début — article=${articleId} uri=${imageUri.substring(0, 50)}…`)
    try {
      const filename = imageUri.split('/').pop() ?? 'photo.jpg'
      addLog('info', `[uploadImage] Construction FormData — filename=${filename}`)
      const formData = new FormData()
      formData.append('file', { uri: imageUri, name: filename, type: 'image/jpeg' } as any)
      addLog('info', `[uploadImage] FormData construit, envoi fetch…`)

      const result = await api.upload<UploadResponse>(`/articles/${articleId}/image`, formData)
      addLog('info', `[uploadImage] Réponse serveur: ${JSON.stringify(result)}`)
      const thumbUrl = fullUrl(result.thumbAppUrl)

      if (thumbUrl) {
        addLog('info', `[uploadImage] Mise à jour DB locale: ${thumbUrl}`)
        const db = await getDb()
        await db.runAsync('UPDATE articles SET thumb_app_url = ? WHERE id = ?', [thumbUrl, articleId])
        await refresh()
      }
      addLog('info', `[uploadImage] Succès: ${articleId}`)
      return thumbUrl
    } catch (e: any) {
      addLog('error', `[uploadImage] ERREUR: ${e?.message} (status=${e?.status})`)
      return null
    }
  }, [refresh, addLog])

  /** Crée un article côté serveur puis rafraîchit le cache local. */
  const create = useCallback(async (input: CreateArticleInput): Promise<string> => {
    const id = generateUUID()
    const isLibrairie = true // simplifié : on envoie toujours isbn si fourni (le rayon décide côté serveur)
    await api.post('/articles', {
      id,
      rayonId: input.rayonId,
      categorieId: input.categorieId ?? null,
      nom: input.nom,
      reference: null,
      description: null,
      prixVenteHT: input.prixVenteHT,
      prixAchatHT: input.prixAchatHT ?? null,
      stock: input.stock ?? 0,
      isbn: input.isbn || null,
      datePublication: null,
      auteurIds: [],
    })
    addLog('info', `Article créé: ${input.nom}`)
    await pullFromServer()
    return id
  }, [pullFromServer, addLog])

  return { articles, loading, refresh, pullFromServer, updateStock, uploadImage, create }
}

/** Cherche un article par ISBN dans la base locale (utilisé par le scanner) */
export async function findByIsbn(isbn: string): Promise<LocalArticle | null> {
  const db = await getDb()
  const isbnNorm = isbn.replace(/[-\s]/g, '')
  return db.getFirstAsync<LocalArticle>(
    "SELECT * FROM articles WHERE REPLACE(REPLACE(isbn, '-', ''), ' ', '') = ? AND actif = 1 LIMIT 1",
    [isbnNorm],
  )
}
