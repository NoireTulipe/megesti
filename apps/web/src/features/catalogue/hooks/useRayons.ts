import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Rayon, Categorie } from '../types'

const KEYS = {
  all:    () => ['rayons'] as const,
  list:   () => ['rayons', 'list'] as const,
}

export function useRayons() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn:  () => api.get<Rayon[]>('/rayons'),
  })
}

export function useCreateRayon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; nom: string; isLibrairie?: boolean }) =>
      api.post<Rayon>('/rayons', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateRayon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; nom?: string; ordre?: number; isLibrairie?: boolean; isMatieresPremiere?: boolean; tauxTVA?: number }) =>
      api.patch<Rayon>(`/rayons/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteRayon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rayons/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useCreateCategorie() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; rayonId: string; nom: string }) =>
      api.post<Categorie>('/categories', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateCategorie() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; nom?: string; ordre?: number }) =>
      api.patch<Categorie>(`/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteCategorie() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
