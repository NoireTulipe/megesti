import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MaisonEdition {
  id:        string
  nom:       string
  siret:     string | null
  email:     string | null
  telephone: string | null
  adresse:   string | null
  actif:     boolean
}

export interface CreateMaisonEditionPayload {
  id:         string
  nom:        string
  siret?:     string
  email?:     string
  telephone?: string
  adresse?:   string
}

const KEYS = {
  all:  () => ['maisonsEdition'] as const,
  list: (q?: string) => ['maisonsEdition', 'list', q ?? ''] as const,
}

export function useMaisonsEdition(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<MaisonEdition[]>(`/maisons-edition${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useCreateMaisonEdition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMaisonEditionPayload) => api.post<MaisonEdition>('/maisons-edition', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateMaisonEdition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateMaisonEditionPayload> & { id: string }) =>
      api.patch<MaisonEdition>(`/maisons-edition/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteMaisonEdition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/maisons-edition/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
