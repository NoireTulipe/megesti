import { useState, useEffect, useCallback } from 'react'
import { getDb, generateUUID } from '@/lib/db'
import { api } from '@/lib/api'
import { syncEngine } from '@/lib/sync'
import { useDevStore } from '@/store/devStore'

export interface LocalVente {
  id: string
  session_id: string | null
  motif_vente_id: string | null
  numero: number | null
  date_vente: string
  mode_paiement: string
  total_ht: number
  total_tva: number
  total_ttc: number
  lignes_json: string
  synced: number
  synced_at: string | null
  statut: string
}

export interface LigneVente {
  articleId: string
  nom: string
  quantite: number
  prixUnitaireHT: number
  tauxTva: number
  totalHT: number
  totalTTC: number
}

export interface CreateVenteInput {
  sessionId?: string
  motifVenteId?: string
  modePaiement: string
  lignes: Omit<LigneVente, 'totalHT' | 'totalTTC'>[]
}

export function useLocalVentes(sessionId?: string) {
  const [ventes, setVentes] = useState<LocalVente[]>([])
  const [loading, setLoading] = useState(true)
  const addLog = useDevStore(s => s.addLog)

  const refresh = useCallback(async () => {
    const db = await getDb()
    const where = sessionId ? 'WHERE session_id = ?' : ''
    const params = sessionId ? [sessionId] : []
    const rows = await db.getAllAsync<LocalVente>(
      `SELECT * FROM ventes_locales ${where} ORDER BY date_vente DESC LIMIT 100`,
      params,
    )
    setVentes(rows)
    setLoading(false)
  }, [sessionId])

  useEffect(() => { refresh() }, [refresh])

  /** Créer une vente : serveur d'abord, fallback local + queue de synchro */
  async function createVente(input: CreateVenteInput) {
    const id = generateUUID()
    const dateVente = new Date().toISOString()

    // Calculer les totaux
    let totalHT = 0, totalTVA = 0, totalTTC = 0
    const lignesCompletes: LigneVente[] = input.lignes.map(l => {
      const ligneHT = l.prixUnitaireHT * l.quantite
      const tauxTVA = l.tauxTva / 100
      const ligneTTC = ligneHT * (1 + tauxTVA)
      totalHT += ligneHT
      totalTVA += ligneTTC - ligneHT
      totalTTC += ligneTTC
      return {
        ...l,
        totalHT: Math.round(ligneHT * 100) / 100,
        totalTTC: Math.round(ligneTTC * 100) / 100,
      }
    })

    const totalHTr  = Math.round(totalHT * 100) / 100
    const totalTVAr = Math.round(totalTVA * 100) / 100
    const totalTTCr = Math.round(totalTTC * 100) / 100

    // Payload API (sans les champs null — rejetés par Zod)
    const syncPayload: Record<string, unknown> = {
      id,
      modePaiement: input.modePaiement,
      dateVente,
      lignes: lignesCompletes.map(l => ({
        articleId: l.articleId,
        quantite: l.quantite,
        prixUnitaireHT: l.prixUnitaireHT,
      })),
    }
    if (input.sessionId) syncPayload.sessionId = input.sessionId
    if (input.motifVenteId) syncPayload.motifVenteId = input.motifVenteId

    // Essayer le serveur d'abord
    let synced = 0
    try {
      await api.post('/ventes', syncPayload)
      synced = 1
      addLog('info', `Vente envoyée au serveur: ${totalTTCr.toFixed(2)} € — ${input.modePaiement}`)
    } catch (e: any) {
      // Si le serveur rejette la vente (article introuvable, etc.), ne pas stocker en local
      if (e?.status === 404 || e?.status === 400) {
        throw e
      }
      addLog('warn', `Vente stockée en local (serveur injoignable): ${e.message}`)
    }

    const db = await getDb()
    await db.runAsync(
      `INSERT INTO ventes_locales (id, session_id, motif_vente_id, date_vente, mode_paiement, total_ht, total_tva, total_ttc, lignes_json, synced, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALIDEE')`,
      [id, input.sessionId ?? null, input.motifVenteId ?? null, dateVente, input.modePaiement, totalHTr, totalTVAr, totalTTCr, JSON.stringify(lignesCompletes), synced],
    )

    // Si le serveur n'a pas répondu, mettre en queue pour retry plus tard
    if (!synced) {
      await syncEngine.enqueue('vente', id, 'create', syncPayload)
    }

    await refresh()
    return id
  }

  /** Annuler une vente (soft delete local + PATCH serveur) */
  async function cancelVente(venteId: string) {
    const db = await getDb()
    await db.runAsync(`UPDATE ventes_locales SET statut = 'ANNULEE' WHERE id = ?`, [venteId])
    api.patch(`/ventes/${venteId}/annuler`, {}).catch(() => {})
    await refresh()
  }

  // Stats (hors annulées)
  const actives = ventes.filter(v => v.statut !== 'ANNULEE')
  const stats = {
    total: actives.reduce((s, v) => s + v.total_ttc, 0),
    count: actives.length,
    enAttente: actives.filter(v => !v.synced).length,
  }

  return { ventes, loading, refresh, createVente, cancelVente, stats }
}
