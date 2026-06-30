import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PointDeVente } from './usePointsDeVente'

export interface SessionCaisse {
  id:             string
  pointDeVenteId: string
  nom:            string | null
  dateOuverture:  string
  dateFermeture:  string | null
  fondOuverture:  string
  fondFermeture:  string | null
  debiterStockME: boolean
  statut:         'OUVERTE' | 'FERMEE'
  pointDeVente:   PointDeVente
  _count?:        { ventes: number }
  _caSession?:    number
}

const KEYS = {
  all:  () => ['sessionsCaisse'] as const,
  list: (pdvId?: string, statut?: string) => ['sessionsCaisse', 'list', pdvId ?? '', statut ?? ''] as const,
  historique: (from: string, to: string) => ['sessionsCaisse', 'historique', from, to] as const,
}

export function useSessionsCaisse(opts?: { pointDeVenteId?: string; statut?: string }) {
  const params = new URLSearchParams()
  if (opts?.pointDeVenteId) params.set('pointDeVenteId', opts.pointDeVenteId)
  if (opts?.statut)         params.set('statut', opts.statut)
  const qs = params.toString()
  return useQuery({
    queryKey: KEYS.list(opts?.pointDeVenteId, opts?.statut),
    queryFn:  () => api.get<SessionCaisse[]>(`/sessions-caisse${qs ? `?${qs}` : ''}`),
  })
}

export function useHistoriqueSessions(from: string, to: string) {
  return useQuery({
    queryKey: KEYS.historique(from, to),
    queryFn:  () => api.get<SessionCaisse[]>(`/sessions-caisse?statut=FERMEE`),
    select:   (data) => data.filter(s => {
      const fermeture = s.dateFermeture ? new Date(s.dateFermeture) : null
      if (!fermeture) return false
      return fermeture >= new Date(from) && fermeture <= new Date(to + 'T23:59:59')
    }),
  })
}

export function useOpenSessionCaisse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; pointDeVenteId: string; nom?: string; fondOuverture?: number; debiterStockME?: boolean }) =>
      api.post<SessionCaisse>('/sessions-caisse', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useCloseSessionCaisse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fondFermeture }: { id: string; fondFermeture?: number }) =>
      api.patch<SessionCaisse>(`/sessions-caisse/${id}/fermer`, { fondFermeture }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useReopenSessionCaisse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<SessionCaisse>(`/sessions-caisse/${id}/rouvrir`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
