import { useState, useEffect, useCallback } from 'react'
import { getDb } from '@/lib/db'
import { api } from '@/lib/api'
import { useDevStore } from '@/store/devStore'

export interface LocalArticle {
  id: string
  nom: string
  reference: string | null
  image_url: string | null
  prix_vente_ht: number
  taux_tva: number
  stock_local: number
  rayon_nom: string | null
  isbn: string | null
  actif: number
}

interface ApiArticle {
  id: string
  nom: string
  reference: string | null
  imageUrl: string | null
  prixVenteHT: number
  rayon: { nom: string; tauxTVA: number }
  isbn: string | null
  stock: number
  actif: boolean
}

export function useLocalArticles(ids?: string[]) {
  const [articles, setArticles] = useState<LocalArticle[]>([])
  const [loading, setLoading] = useState(true)
  const addLog = useDevStore(s => s.addLog)

  const refresh = useCallback(async () => {
    const db = getDb()
    let rows: LocalArticle[]
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      rows = await db.getAllAsync<LocalArticle>(
        `SELECT * FROM articles WHERE id IN (${placeholders}) ORDER BY nom ASC`,
        ids,
      )
    } else {
      rows = await db.getAllAsync<LocalArticle>(
        'SELECT * FROM articles WHERE actif = 1 ORDER BY nom ASC',
      )
    }
    setArticles(rows)
    setLoading(false)
  }, [ids?.join(',')])

  useEffect(() => { refresh() }, [refresh])

  /** Télécharger les articles depuis l'API et les stocker en local */
  async function pullFromServer(articleIds?: string[]) {
    try {
      const data = await api.get<ApiArticle[]>('/articles?actif=true&take=500')
      const db = getDb()

      const filtered = articleIds
        ? data.filter(a => articleIds.includes(a.id))
        : data

      for (const a of filtered) {
        await db.runAsync(
          `INSERT OR REPLACE INTO articles (id, nom, reference, image_url, prix_vente_ht, taux_tva, stock_local, rayon_nom, isbn, actif)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [a.id, a.nom, a.reference, a.imageUrl, Number(a.prixVenteHT), Number(a.rayon.tauxTVA), a.stock, a.rayon.nom, a.isbn],
        )
      }
      addLog('info', `${filtered.length} articles téléchargés`)
      await refresh()
    } catch (e: any) {
      addLog('error', `Échec pull articles: ${e?.message}`)
    }
  }

  return { articles, loading, refresh, pullFromServer }
}
