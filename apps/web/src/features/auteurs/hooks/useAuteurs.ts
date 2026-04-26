import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Auteur {
  id:         string
  prenom:     string
  nom:        string
  pseudonyme: string | null
  email:      string | null
  bio:        string | null
  actif:      boolean
}

export interface CreateAuteurPayload {
  id:          string
  prenom:      string
  nom:         string
  pseudonyme?: string
  email?:      string
  bio?:        string
}

const KEYS = {
  all:  () => ['auteurs'] as const,
  list: (q?: string) => ['auteurs', 'list', q ?? ''] as const,
}

export function useAuteurs(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<Auteur[]>(`/auteurs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useCreateAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAuteurPayload) => api.post<Auteur>('/auteurs', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateAuteurPayload> & { id: string }) =>
      api.patch<Auteur>(`/auteurs/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/auteurs/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
