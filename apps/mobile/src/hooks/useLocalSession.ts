import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

  // Valider la session locale contre le serveur (appelé au démarrage)
  async function validateWithServer() {
    const db = await getDb()
    const local = await db.getFirstAsync<LocalSession>(
      'SELECT * FROM sessions WHERE statut = ? ORDER BY date_ouverture DESC LIMIT 1',
      ['OUVERTE'],
    )
    if (!local) return
    try {
      const data = await api.get<any[]>('/sessions-caisse?statut=OUVERTE')
      const stillOpen = data.some((s: any) => s.id === local.id)
      if (!stillOpen) {
        addLog('warn', `Session ${local.id} fermée ailleurs → mise à jour locale`)
        await db.runAsync(`UPDATE sessions SET statut = 'FERMEE', synced = 1 WHERE id = ?`, [local.id])
        await refresh()
      }
    } catch {
      // serveur injoignable, on garde l'état local
    }
  }

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
    const sessionId = session.id

    // Essayer le serveur d'abord
    let synced = 0
    try {
      await api.patch(`/sessions-caisse/${sessionId}/fermer`, { fondFermeture })
      synced = 1
      addLog('info', `Session fermée sur le serveur: fond final ${fondFermeture.toFixed(2)} €`)
    } catch (e: any) {
      // 400 "déjà fermée" → on marque comme synced
      if (e?.status === 400 && e?.message?.includes('déjà fermée')) {
        synced = 1
        addLog('warn', 'Session déjà fermée sur le serveur')
      } else {
        addLog('warn', `Session fermée en local (serveur injoignable): ${e.message}`)
      }
    }

    await db.runAsync(
      `UPDATE sessions SET statut = 'FERMEE', fond_fermeture = ?, synced = ? WHERE id = ?`,
      [fondFermeture, synced, sessionId],
    )

    if (!synced) {
      await syncEngine.enqueue('session_close', sessionId, 'close', {
        fondFermeture,
        dateFermeture: new Date().toISOString(),
      })
    }
    await refresh()
  }

  return { session, loading, refresh, openSession, closeSession, validateWithServer }
}

export interface SessionWithStats extends LocalSession {
  venteCount: number
  ca: number
}

const HISTORY_PAGE = 10

async function attachStats(db: Awaited<ReturnType<typeof getDb>>, rows: LocalSession[]): Promise<SessionWithStats[]> {
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)
  const ph  = ids.map(() => '?').join(',')
  const statsRows = await db.getAllAsync<{ session_id: string; count: number; ca: number }>(
    `SELECT session_id, COUNT(*) as count, COALESCE(SUM(total_ttc),0) as ca
     FROM ventes_locales WHERE statut != 'ANNULEE' AND session_id IN (${ph}) GROUP BY session_id`,
    ids,
  )
  const map = new Map(statsRows.map(s => [s.session_id, s]))
  return rows.map(s => ({
    ...s,
    venteCount: map.get(s.id)?.count ?? 0,
    ca:         map.get(s.id)?.ca    ?? 0,
  }))
}

/** Sessions actives + historique paginé (10 par page) */
export function useAllSessions() {
  const [actives,        setActives]        = useState<SessionWithStats[]>([])
  const [history,        setHistory]        = useState<SessionWithStats[]>([])
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [loadingMore,    setLoadingMore]    = useState(false)
  const [loading,        setLoading]        = useState(true)
  const loadedCount = useRef(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    const db = await getDb()

    const [activeRows, histRows, totalRow] = await Promise.all([
      db.getAllAsync<LocalSession>("SELECT * FROM sessions WHERE statut='OUVERTE' ORDER BY date_ouverture DESC"),
      db.getAllAsync<LocalSession>("SELECT * FROM sessions WHERE statut='FERMEE' ORDER BY date_ouverture DESC LIMIT ?", [HISTORY_PAGE]),
      db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM sessions WHERE statut='FERMEE'"),
    ])
    const [a, h] = await Promise.all([attachStats(db, activeRows), attachStats(db, histRows)])
    loadedCount.current = histRows.length
    setActives(a)
    setHistory(h)
    setHistoryHasMore(histRows.length < (totalRow?.total ?? 0))
    setLoading(false)
  }, [])

  const loadMoreHistory = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const db = await getDb()
    const more = await db.getAllAsync<LocalSession>(
      "SELECT * FROM sessions WHERE statut='FERMEE' ORDER BY date_ouverture DESC LIMIT ? OFFSET ?",
      [HISTORY_PAGE, loadedCount.current],
    )
    const withStats = await attachStats(db, more)
    loadedCount.current += more.length
    setHistory(prev => [...prev, ...withStats])
    const totalRow = await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM sessions WHERE statut='FERMEE'")
    setHistoryHasMore(loadedCount.current < (totalRow?.total ?? 0))
    setLoadingMore(false)
  }, [loadingMore])

  useEffect(() => { refresh() }, [refresh])

  // Rétrocompatibilité avec le DetailSheet qui utilise session.id
  const sessions = useMemo(() => [...actives, ...history], [actives, history])

  return { sessions, actives, history, historyHasMore, loadingMore, loading, refresh, loadMoreHistory }
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
