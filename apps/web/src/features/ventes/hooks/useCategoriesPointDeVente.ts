import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CategoriePointDeVente { id: string; nom: string; ordre: number }

const KEYS = { all: () => ['categoriesPDV'] as const }

export function useCategoriesPointDeVente() {
  return useQuery({
    queryKey: KEYS.all(),
    queryFn:  () => api.get<CategoriePointDeVente[]>('/categories-point-de-vente'),
  })
}

export function useCreateCategoriePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; nom: string; ordre?: number }) =>
      api.post<CategoriePointDeVente>('/categories-point-de-vente', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateCategoriePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nom?: string; ordre?: number }) =>
      api.patch<CategoriePointDeVente>(`/categories-point-de-vente/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteCategoriePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/categories-point-de-vente/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
