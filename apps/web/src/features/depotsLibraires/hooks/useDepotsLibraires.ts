import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ContactDepot {
  id:        string
  nom:       string
  prenom:    string | null
  email:     string | null
  telephone: string | null
}

export interface ArticleDepot {
  id:              string
  articleId:       string
  quantiteEnvoyee: number
  quantiteVendue:  number
  dateEnvoi:       string
  notes:           string | null
  article: { id: string; nom: string; isbn: string | null; prixVenteHT: string; stock: number }
}

export interface DepotLibraire {
  id:                 string
  nom:                string
  adresse:            string | null
  commissionFixe:     string | null
  commissionPourcent: string | null
  actif:              boolean
  contacts:           ContactDepot[]
  articles:           ArticleDepot[]
}

export interface DepotLibraireList extends Omit<DepotLibraire, 'contacts' | 'articles'> {
  contacts: { id: string }[]
  articles: { id: string; quantiteEnvoyee: number; quantiteVendue: number }[]
}

const KEY = ['depots-libraires'] as const

export function useDepotsLibraires(q?: string) {
  return useQuery({
    queryKey: [...KEY, q ?? ''],
    queryFn:  () => api.get<DepotLibraireList[]>(`/depots-libraires${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useDepotLibraireDetail(id?: string) {
  return useQuery({
    queryKey: [...KEY, 'detail', id ?? ''],
    queryFn:  () => api.get<DepotLibraire>(`/depots-libraires/${id}`),
    enabled:  !!id,
  })
}

export function useCreateDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; nom: string; adresse?: string; commissionFixe?: number | null; commissionPourcent?: number | null }) =>
      api.post<DepotLibraire>('/depots-libraires', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nom?: string; adresse?: string | null; commissionFixe?: number | null; commissionPourcent?: number | null }) =>
      api.patch<DepotLibraire>(`/depots-libraires/${id}`, data),
    onSuccess: async () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteDepotLibraire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/depots-libraires/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCreateContact(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; nom: string; prenom?: string; email?: string; telephone?: string }) =>
      api.post<ContactDepot>(`/depots-libraires/${depotId}/contacts`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateContact(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ContactDepot> & { id: string }) =>
      api.patch<ContactDepot>(`/depots-libraires/${depotId}/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteContact(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) =>
      api.delete(`/depots-libraires/${depotId}/contacts/${contactId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useEnvoyerArticle(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; articleId: string; quantiteEnvoyee: number; notes?: string }) =>
      api.post<ArticleDepot>(`/depots-libraires/${depotId}/articles`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRetirerArticle(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (articleDepotId: string) =>
      api.delete(`/depots-libraires/${depotId}/articles/${articleDepotId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useConfirmerVente(depotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { articleDepotId: string; quantite: number }) =>
      api.post<{ vente: unknown; commission: number }>(`/depots-libraires/${depotId}/confirmer-vente`, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
