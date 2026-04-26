import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Article, CreateArticlePayload } from '../types'

const KEYS = {
  all:  () => ['articles'] as const,
  list: (rayonId?: string, q?: string) => ['articles', 'list', rayonId ?? '', q ?? ''] as const,
}

export function useArticles(rayonId?: string, q?: string) {
  return useQuery({
    queryKey: KEYS.list(rayonId, q),
    queryFn:  () => {
      const params = new URLSearchParams()
      if (rayonId) params.set('rayonId', rayonId)
      if (q)       params.set('q', q)
      const qs = params.toString()
      return api.get<Article[]>(`/articles${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateArticlePayload) => api.post<Article>('/articles', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateArticlePayload> & { id: string }) =>
      api.patch<Article>(`/articles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/articles/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
