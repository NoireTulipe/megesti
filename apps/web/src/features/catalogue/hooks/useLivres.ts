import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Livre, CreateLivrePayload } from '../types'

const KEYS = {
  all:    () => ['livres'] as const,
  list:   (q?: string) => ['livres', 'list', q ?? ''] as const,
  detail: (id: string) => ['livres', id] as const,
}

export function useLivres(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<Livre[]>(`/livres${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useLivre(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => api.get<Livre>(`/livres/${id}`),
  })
}

export function useCreateLivre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLivrePayload) => api.post<Livre>('/livres', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteLivre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/livres/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
