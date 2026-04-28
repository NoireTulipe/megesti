import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FormuleDA } from '@megesti/business'

export interface TypeDA {
  id:       string
  nom:      string
  formule:  FormuleDA
  _count:   { contrats: number }
}

const KEY = ['types-da'] as const

export function useTypesDA() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<TypeDA[]>('/types-da') })
}

export function useCreateTypeDA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; nom: string; formule: FormuleDA }) =>
      api.post<TypeDA>('/types-da', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateTypeDA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; nom?: string; formule?: FormuleDA }) =>
      api.patch<TypeDA>(`/types-da/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTypeDA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/types-da/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
