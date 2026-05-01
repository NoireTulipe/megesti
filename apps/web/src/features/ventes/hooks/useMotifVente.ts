import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MotifVente {
  id:      string
  libelle: string
  ordre:   number
  actif:   boolean
}

const KEY = ['motifs-vente']

export function useMotifVente() {
  return useQuery<MotifVente[]>({
    queryKey: KEY,
    queryFn:  () => api.get<MotifVente[]>('/motifs-vente'),
    staleTime: 60_000,
  })
}

export function useCreateMotifVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (libelle: string) =>
      api.post<MotifVente>('/motifs-vente', { id: crypto.randomUUID(), libelle }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteMotifVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/motifs-vente/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
