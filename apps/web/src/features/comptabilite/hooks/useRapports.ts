import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type Period = '7d' | '30d' | '3m' | '12m' | 'all'

export interface RapportVentes {
  periode: { from: string; to: string; granularite: 'day' | 'week' | 'month' }
  summary: {
    totalTTC:    number
    totalHT:     number
    nbVentes:    number
    nbAnnulees:  number
    ticketMoyen: number
  }
  evolution:   { date: string; ca: number; nb: number }[]
  topArticles: { articleId: string; nom: string; rayonNom: string; quantite: number; ca: number }[]
  caParRayon:  { rayonId: string; nom: string; ca: number; quantite: number }[]
  caParPDV:    { pdvId: string; nom: string; ca: number; nbVentes: number }[]
  caParMode:   { mode: string; ca: number; nb: number }[]
  associations: { produit1: string; produit2: string; nb: number }[]
}

export function useRapportVentes(period: Period) {
  return useQuery({
    queryKey: ['rapports', 'ventes', period],
    queryFn:  () => api.get<RapportVentes>(`/rapports/ventes?period=${period}`),
    staleTime: 60_000,
  })
}
