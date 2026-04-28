import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CategoriePointDeVente } from './useCategoriesPointDeVente'

export interface PointDeVente {
  id:                 string
  nom:                string
  salonId:            string | null
  categorieId:        string | null
  commissionFixe:     string | null
  commissionPourcent: string | null
  encaissementDirect: boolean
  actif:              boolean
  categorie:          CategoriePointDeVente | null
  salon:              { id: string; nom: string } | null
}

export interface CreatePointDeVentePayload {
  id:                  string
  nom:                 string
  categorieId?:        string | null
  commissionFixe?:     number | null
  commissionPourcent?: number | null
  encaissementDirect?: boolean
}

const KEYS = { all: () => ['pointsDeVente'] as const, list: (q?: string) => ['pointsDeVente', 'list', q ?? ''] as const }

export function usePointsDeVente(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<PointDeVente[]>(`/points-de-vente${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useCreatePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreatePointDeVentePayload) => api.post<PointDeVente>('/points-de-vente', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdatePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreatePointDeVentePayload> & { id: string }) =>
      api.patch<PointDeVente>(`/points-de-vente/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeletePointDeVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/points-de-vente/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
