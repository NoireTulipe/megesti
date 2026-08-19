import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Article, CreateArticlePayload } from '../types'

const KEYS = {
  all:  () => ['articles'] as const,
  list: (rayonId?: string, q?: string, actif?: boolean, vendable?: boolean) =>
    ['articles', 'list', rayonId ?? '', q ?? '', String(actif ?? true), String(vendable ?? 'all')] as const,
}

/** `vendable: true` dans les contextes de vente (caisse, dépôts…) pour exclure les matières premières. */
export function useArticles(rayonId?: string, q?: string, actif = true, vendable?: boolean) {
  return useQuery({
    queryKey: KEYS.list(rayonId, q, actif, vendable),
    queryFn:  () => {
      const params = new URLSearchParams()
      if (rayonId) params.set('rayonId', rayonId)
      if (q)       params.set('q', q)
      params.set('actif', String(actif))
      if (vendable !== undefined) params.set('vendable', String(vendable))
      return api.get<Article[]>(`/articles?${params.toString()}`)
    },
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateArticlePayload) => api.post<Article>('/articles', p),
    meta: { successMessage: 'Article créé' },
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateArticlePayload> & { id: string }) =>
      api.patch<Article>(`/articles/${id}`, body),
    meta: { successMessage: 'Article mis à jour' },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useSetArticleActif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      api.patch<Article>(`/articles/${id}`, { actif }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/articles/${id}`),
    meta: { successMessage: 'Article archivé' },
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
