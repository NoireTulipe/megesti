import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DepotLibraire {
  id:      string
  nom:     string
  contact: string | null
  adresse: string | null
  actif:   boolean
}

export interface CreateDepotLibrairePayload {
  id:       string
  nom:      string
  contact?: string
  adresse?: string
}

const KEYS = {
  all:  () => ['depotsLibraires'] as const,
  list: (q?: string) => ['depotsLibraires', 'list', q ?? ''] as const,
}

export function useDepotsLibraires(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<DepotLibraire[]>(`/depots-libraires${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useCreateDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDepotLibrairePayload) => api.post<DepotLibraire>('/depots-libraires', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateDepotLibrairePayload> & { id: string }) =>
      api.patch<DepotLibraire>(`/depots-libraires/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/depots-libraires/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
