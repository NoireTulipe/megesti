import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Salon {
  id:        string
  nom:       string
  lieu:      string | null
  dateDebut: string | null
  dateFin:   string | null
  actif:     boolean
}

export interface CreateSalonPayload {
  id:         string
  nom:        string
  lieu?:      string
  dateDebut?: string
  dateFin?:   string
}

const KEYS = {
  all:  () => ['salons'] as const,
  list: (q?: string) => ['salons', 'list', q ?? ''] as const,
}

export function useSalons(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<Salon[]>(`/salons${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useCreateSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSalonPayload) => api.post<Salon>('/salons', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateSalonPayload> & { id: string }) =>
      api.patch<Salon>(`/salons/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/salons/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
