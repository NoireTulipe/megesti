import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ContactImprimeur {
  id?:       string
  nom:       string
  prenom?:   string | null
  email?:    string | null
  telephone?: string | null
}

export interface Imprimeur {
  id:            string
  nom:           string
  lienCommande:  string | null
  pointsForts:   string[]
  pointsFaibles: string[]
  noteLibre:     string | null
  actif:         boolean
  contacts:      ContactImprimeur[]
}

export interface CreateImprimeurPayload {
  id:            string
  nom:           string
  lienCommande?: string | null
  pointsForts?:  string[]
  pointsFaibles?: string[]
  noteLibre?:    string | null
  contacts?:     Omit<ContactImprimeur, 'id'>[]
}

const KEYS = {
  all:  () => ['imprimeurs'] as const,
  list: (q?: string) => ['imprimeurs', 'list', q ?? ''] as const,
  detail: (id: string) => ['imprimeurs', 'detail', id] as const,
}

export function useImprimeurs(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => api.get<Imprimeur[]>(`/imprimeurs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useImprimeur(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => api.get<Imprimeur>(`/imprimeurs/${id}`),
    enabled:  Boolean(id),
  })
}

export function useCreateImprimeur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateImprimeurPayload) => api.post<Imprimeur>('/imprimeurs', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateImprimeur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateImprimeurPayload> & { id: string }) =>
      api.patch<Imprimeur>(`/imprimeurs/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteImprimeur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/imprimeurs/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
