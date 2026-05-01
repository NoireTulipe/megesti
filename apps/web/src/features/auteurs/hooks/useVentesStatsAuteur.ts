import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MoisStat {
  key:      string
  label:    string
  quantite: number
  totalHT:  number
}

export function useVentesStatsAuteur(auteurId?: string, period: 1 | 3 | 12 = 12) {
  return useQuery({
    queryKey: ['ventes-stats-auteur', auteurId ?? '', period],
    queryFn:  () => api.get<{ months: MoisStat[] }>(`/auteurs/${auteurId}/ventes-stats?period=${period}`),
    enabled:  !!auteurId,
  })
}
