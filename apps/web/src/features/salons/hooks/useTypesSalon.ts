import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TypeSalon } from './useSalons'

const KEY = ['types-salon'] as const

export function useTypesSalon() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<TypeSalon[]>('/types-salon') })
}

export function useCreateTypeSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (libelle: string) => api.post<TypeSalon>('/types-salon', { id: crypto.randomUUID(), libelle }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTypeSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/types-salon/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
