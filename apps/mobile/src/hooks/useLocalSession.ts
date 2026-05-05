import { useState, useEffect, useCallback } from 'react'
import { getDb, generateUUID } from '@/lib/db'
import { api } from '@/lib/api'
import { syncEngine } from '@/lib/sync'
import { useDevStore } from '@/store/devStore'

export interface LocalSession {
  id: string
  point_de_vente_id: string
  point_de_vente_nom: string | null
  salon_id: string | null
  date_ouverture: string
  fond_ouverture: number
  fond_fermeture: number | null
  debiter_stock: number
  statut: 'OUVERTE' | 'FERMEE'
  articles_exposes: string | null // JSON array d'IDs
  synced: number
}

export interface PointDeVente {
  id: string
  nom: string
  encaissementDirect: boolean
  commissionPourcent: number | null
}

export function useLocalSession() {
  const [session, setSession] = useState<LocalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const addLog = useDevStore(s => s.addLog)

  const refresh = useCallback(async () => {
    const db = await getDb()
    const row = await db.getFirstAsync<LocalSession>(
      'SELECT * FROM sessions WHERE statut = ? ORDER BY date_ouverture DESC LIMIT 1',
      ['OUVERTE'],
    )
    setSession(row ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function openSession(pdvId: string, pdvNom: string, fondOuverture: number, articleIds: string[], salonId?: string) {
    const id = generateUUID()
    const db = await getDb()

    // Essayer de créer la session sur le serveur d'abord
    let synced = 0
    try {
      await api.post('/sessions-caisse', {
        id,
        pointDeVenteId: pdvId,
        nom: pdvNom,
        fondOuverture,
        debiterStockME: true,
      })
      synced = 1
      addLog('info', `Session créée sur le serveur: ${pdvNom}`)
    } catch (e: any) {
      addLog('warn', `Session stockée en local (serveur injoignable): ${e.message}`)
    }

    await db.runAsync(
      `INSERT INTO sessions (id, point_de_vente_id, point_de_vente_nom, salon_id, date_ouverture, fond_ouverture, debiter_stock, statut, articles_exposes, synced)
       VALUES (?, ?, ?, ?, datetime('now'), ?, 1, 'OUVERTE', ?, ?)`,
      [id, pdvId, pdvNom, salonId ?? null, fondOuverture, JSON.stringify(articleIds), synced],
    )
    addLog('info', `Session ouverte: ${pdvNom} (${articleIds.length} articles)`)
    await refresh()
    return id
  }

  async function closeSession(fondFermeture: number) {
    if (!session) return
    const db = await getDb()
    await db.runAsync(
      `UPDATE sessions SET statut = 'FERMEE', fond_fermeture = ?, synced = 0 WHERE id = ?`,
      [fondFermeture, session.id],
    )
    await syncEngine.enqueue('session_close', session.id, 'close', {
      fondFermeture,
      dateFermeture: new Date().toISOString(),
    })
    addLog('info', `Session fermée: fond final ${fondFermeture.toFixed(2)} €`)
    await refresh()
  }

  return { session, loading, refresh, openSession, closeSession }
}

/** Récupère la liste des points de vente depuis l'API */
export function usePointsDeVente() {
  const [pdvs, setPdvs] = useState<PointDeVente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const addLog = useDevStore(s => s.addLog)

  useEffect(() => {
    api.get<PointDeVente[]>('/points-de-vente')
      .then(data => {
        setPdvs(data)
        addLog('info', `${data.length} point(s) de vente chargés`)
      })
      .catch(err => {
        setError(err.message ?? 'Erreur inconnue')
        addLog('error', `Échec chargement PDV: ${err.message}`)
      })
      .finally(() => setLoading(false))
  }, [])

  return { pdvs, loading, error }
}
