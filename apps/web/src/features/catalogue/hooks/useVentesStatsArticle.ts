import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MoisStat } from '@/features/auteurs/hooks/useVentesStatsAuteur'

export type { MoisStat }

export function useVentesStatsArticle(articleId?: string, period: 1 | 3 | 12 = 12) {
  return useQuery({
    queryKey: ['ventes-stats-article', articleId ?? '', period],
    queryFn:  () => api.get<{ months: MoisStat[] }>(`/articles/${articleId}/ventes-stats?period=${period}`),
    enabled:  !!articleId,
  })
}
