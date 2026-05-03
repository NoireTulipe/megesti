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
  _count:     { contrats: number; articles: number }
}

export interface ArticleForAuteur {
  articleId: string
  ordre:     number
  article:   { id: string; nom: string; isbn: string | null; stock: number; prixVenteHT: string }
}

export interface AuteurDetail extends Auteur {
  articles: ArticleForAuteur[]
}

export interface CreateAuteurPayload {
  id:          string
  prenom:      string
  nom:         string
  pseudonyme?: string
  email?:      string
  bio?:        string
}

interface UseAuteursOptions {
  q?:           string
  avecContrat?: boolean  // true = ME seulement, false = réseau seulement, undefined = tous
}

const KEYS = {
  all:  () => ['auteurs'] as const,
  list: (opts: UseAuteursOptions) =>
    ['auteurs', 'list', opts.q ?? '', String(opts.avecContrat ?? '')] as const,
}

export function useAuteurs(opts: UseAuteursOptions = {}) {
  return useQuery({
    queryKey: KEYS.list(opts),
    queryFn: () => {
      const params = new URLSearchParams()
      if (opts.q)                          params.set('q', opts.q)
      if (opts.avecContrat !== undefined)  params.set('avecContrat', String(opts.avecContrat))
      const qs = params.toString()
      return api.get<Auteur[]>(`/auteurs${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useAuteurDetail(id?: string) {
  return useQuery({
    queryKey: [...KEYS.all(), 'detail', id ?? ''],
    queryFn:  () => api.get<AuteurDetail>(`/auteurs/${id}`),
    enabled:  !!id,
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
