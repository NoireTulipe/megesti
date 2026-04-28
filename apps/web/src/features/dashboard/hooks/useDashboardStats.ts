import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardStats {
  caMois: { totalTTC: number; nombreVentes: number }
  sessionActive: { id: string; pointDeVente: string; dateOuverture: string } | null
  alertesStock: Array<{ id: string; nom: string; stock: number; stockAlerte: number }>
  activiteRecente: Array<{
    id: string
    numero: number
    dateVente: string
    totalTTC: number
    modePaiement: string
    premierArticle: string | null
  }>
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60_000,
  })
}
