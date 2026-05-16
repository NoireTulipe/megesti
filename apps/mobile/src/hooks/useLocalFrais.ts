import { useState, useEffect, useCallback } from 'react'
import { getDb, generateUUID } from '@/lib/db'
import { api } from '@/lib/api'
import { syncEngine } from '@/lib/sync'
import { useDevStore } from '@/store/devStore'

export interface LocalFrais {
  id: string
  session_id: string | null
  type: string
  motif: string
  montant_ht: number | null
  date: string
  synced: number
  actif: number
}

export interface CreateFraisInput {
  sessionId?: string
  type: string
  motif: string
  montantHT?: number
}

export const FRAIS_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'DEPLACEMENT', label: 'Déplacement',  emoji: '🚗' },
  { value: 'REPAS',       label: 'Repas',         emoji: '🍽️' },
  { value: 'HEBERGEMENT', label: 'Hébergement',   emoji: '🏨' },
  { value: 'STAND',       label: 'Stand',          emoji: '🏪' },
  { value: 'DON',         label: 'Don',            emoji: '🎁' },
  { value: 'PERTE_STOCK', label: 'Perte stock',    emoji: '📉' },
  { value: 'AUTRE',       label: 'Autre',          emoji: '📋' },
]

export function fraisLabel(type: string): string {
  return FRAIS_TYPES.find(t => t.value === type)?.label ?? type
}

export function fraisEmoji(type: string): string {
  return FRAIS_TYPES.find(t => t.value === type)?.emoji ?? '📋'
}

export function useLocalFrais(sessionId?: string) {
  const [frais, setFrais] = useState<LocalFrais[]>([])
  const [loading, setLoading] = useState(true)
  const addLog = useDevStore(s => s.addLog)

  const refresh = useCallback(async () => {
    const db = await getDb()
    const where = sessionId ? 'WHERE session_id = ? AND actif = 1' : 'WHERE actif = 1'
    const params = sessionId ? [sessionId] : []
    const rows = await db.getAllAsync<LocalFrais>(
      `SELECT * FROM frais_locaux ${where} ORDER BY date DESC`,
      params,
    )
    setFrais(rows)
    setLoading(false)
  }, [sessionId])

  useEffect(() => { refresh() }, [refresh])

  async function createFrais(input: CreateFraisInput): Promise<string> {
    const id = generateUUID()
    const date = new Date().toISOString()
    const db = await getDb()

    let synced = 0
    try {
      await api.post('/frais', {
        id,
        sessionId: input.sessionId,
        type: input.type,
        motif: input.motif,
        montantHT: input.montantHT,
        date,
      })
      synced = 1
    } catch (e: any) {
      addLog('warn', `Frais stocké en local: ${e.message}`)
    }

    await db.runAsync(
      `INSERT INTO frais_locaux (id, session_id, type, motif, montant_ht, date, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.sessionId ?? null, input.type, input.motif, input.montantHT ?? null, date, synced],
    )

    if (!synced) {
      await syncEngine.enqueue('frais', id, 'create', {
        id, sessionId: input.sessionId, type: input.type,
        motif: input.motif, montantHT: input.montantHT, date,
      })
    }

    await refresh()
    return id
  }

  async function updateFrais(id: string, input: Partial<CreateFraisInput>) {
    const db = await getDb()
    const parts: string[] = []
    const params: (string | number | null)[] = []

    if (input.type !== undefined) { parts.push('type = ?'); params.push(input.type) }
    if (input.motif !== undefined) { parts.push('motif = ?'); params.push(input.motif) }
    if (input.montantHT !== undefined) { parts.push('montant_ht = ?'); params.push(input.montantHT) }
    if (parts.length === 0) return

    params.push(id)
    await db.runAsync(`UPDATE frais_locaux SET ${parts.join(', ')} WHERE id = ?`, params)
    api.patch(`/frais/${id}`, {
      type: input.type, motif: input.motif, montantHT: input.montantHT,
    }).catch(() => {})
    await refresh()
  }

  async function deleteFrais(id: string) {
    const db = await getDb()
    await db.runAsync('DELETE FROM frais_locaux WHERE id = ?', [id])
    api.delete(`/frais/${id}`).catch(() => {})
    await refresh()
  }

  const totalFrais = frais.reduce((s, f) => s + (f.montant_ht ?? 0), 0)

  return { frais, loading, refresh, createFrais, updateFrais, deleteFrais, totalFrais }
}
