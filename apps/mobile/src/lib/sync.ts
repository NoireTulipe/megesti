import { getDb } from './db'
import { api } from './api'

// ── Types ──────────────────────────────────────────────────────────

export type SyncStatus = 'online' | 'offline' | 'syncing'

type Listener = (status: SyncStatus, pendingCount: number) => void

// ── État ───────────────────────────────────────────────────────────

let _status: SyncStatus = 'online'
let _pendingCount = 0
let _retryTimer: ReturnType<typeof setTimeout> | null = null
let _pingTimer: ReturnType<typeof setInterval> | null = null
const _listeners = new Set<Listener>()

// ── API publique ───────────────────────────────────────────────────

export const syncEngine = {
  get status() { return _status },
  get pendingCount() { return _pendingCount },

  subscribe(fn: Listener) {
    _listeners.add(fn)
    fn(_status, _pendingCount)
    return () => { _listeners.delete(fn) }
  },

  /** Appelé après chaque opération locale (vente, frais, fermeture session) */
  async enqueue(entityType: string, entityId: string, operation: string, payload: unknown) {
    const db = await getDb()
    await db.runAsync(
      `INSERT INTO sync_queue (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
      [entityType, entityId, operation, JSON.stringify(payload)],
    )
    await updatePendingCount()
    if (_status === 'online') processQueue()
  },

  /** Démarre la surveillance réseau */
  start() {
    checkNetwork()
    _pingTimer = setInterval(checkNetwork, 30_000) // ping toutes les 30s
  },

  /** Arrête la surveillance */
  stop() {
    if (_pingTimer) clearInterval(_pingTimer)
    if (_retryTimer) clearTimeout(_retryTimer)
  },
}

// ── Surveillance réseau ────────────────────────────────────────────

async function checkNetwork() {
  try {
    await api.get('/auth/ping')
    setStatus('online')
  } catch {
    setStatus('offline')
  }
}

// ── Traitement de la queue ─────────────────────────────────────────

async function processQueue() {
  if (_status === 'syncing') return
  const prevStatus = _status
  setStatus('syncing')

  const db = await getDb()

  try {
    const pending = await db.getAllAsync<{
      id: number; entity_type: string; entity_id: string
      operation: string; payload: string; retry_count: number
    }>(
      'SELECT * FROM sync_queue ORDER BY id ASC LIMIT 20',
    )

    if (pending.length === 0) {
      setStatus('online')
      return
    }

    for (const item of pending) {
      try {
        const body = JSON.parse(item.payload)

        switch (item.entity_type) {
          case 'vente':
            await api.post('/ventes', body)
            break
          case 'frais':
            await api.post('/frais', body)
            break
          case 'session_close':
            await api.patch(`/sessions-caisse/${item.entity_id}/fermer`, body)
            break
          default:
            // On log et on skip
            console.warn(`[sync] type inconnu: ${item.entity_type}`)
        }

        // Marquer comme synchronisé
        await db.runAsync(
          `UPDATE ${item.entity_type === 'vente' ? 'ventes_locales' : item.entity_type === 'frais' ? 'frais_locaux' : 'sessions'} SET synced = 1, synced_at = datetime('now') WHERE id = ?`,
          [item.entity_id],
        )
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id])
      } catch (e: any) {
        const retryCount = item.retry_count + 1
        await db.runAsync(
          'UPDATE sync_queue SET retry_count = ?, last_error = ? WHERE id = ?',
          [retryCount, e?.message ?? 'Erreur inconnue', item.id],
        )

        // Si trop de tentatives, on arrête et on notifie
        if (retryCount >= 5) {
          console.error(`[sync] Abandon après 5 tentatives: ${item.entity_type}/${item.entity_id}`)
        }
      }
    }

    await updatePendingCount()

    // S'il reste des éléments, reprogrammer avec backoff
    const remaining = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM sync_queue WHERE retry_count < 5',
    )
    if (remaining && remaining.cnt > 0) {
      const delay = Math.min(1000 * Math.pow(2, Math.min(pending[0]?.retry_count ?? 0, 5)), 60000)
      _retryTimer = setTimeout(processQueue, delay)
    }
  } catch (e) {
    console.error('[sync] Erreur processQueue:', e)
  }

  setStatus(prevStatus)
}

// ── Helpers ────────────────────────────────────────────────────────

async function updatePendingCount() {
  const db = await getDb()
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM sync_queue',
  )
  _pendingCount = row?.cnt ?? 0
  _notify()
}

function setStatus(s: SyncStatus) {
  if (_status === s) return
  _status = s
  _notify()
  if (s === 'online') processQueue()
}

function _notify() {
  for (const fn of _listeners) fn(_status, _pendingCount)
}
