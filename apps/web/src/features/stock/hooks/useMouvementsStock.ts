import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type TypeMouvement = 'ENTREE' | 'SORTIE_DON' | 'SORTIE_PERTE' | 'SORTIE_VOL' | 'SORTIE_DEGRADATION' | 'AJUSTEMENT'

export const MVT_LABELS: Record<TypeMouvement, string> = {
  ENTREE:              'Entrée stock',
  SORTIE_DON:          'Don',
  SORTIE_PERTE:        'Perte',
  SORTIE_VOL:          'Vol',
  SORTIE_DEGRADATION:  'Dégradation',
  AJUSTEMENT:          'Ajustement',
}

export const MVT_EMOJI: Record<TypeMouvement, string> = {
  ENTREE:              '📥',
  SORTIE_DON:          '🎁',
  SORTIE_PERTE:        '📦',
  SORTIE_VOL:          '🚨',
  SORTIE_DEGRADATION:  '💧',
  AJUSTEMENT:          '⚖️',
}

export interface MouvementStock {
  id:         string
  articleId:  string
  type:       TypeMouvement
  delta:      number
  stockAvant: number
  stockApres: number
  motif:      string | null
  createdAt:  string
  article:    { id: string; nom: string; rayon: { id: string; nom: string } }
}

export type MvtPeriod = '7d' | '30d' | '3m' | '12m'

export interface CreateMouvementPayload {
  id:          string
  articleId:   string
  type:        TypeMouvement
  quantite?:   number
  stockCible?: number
  motif?:      string
  montantHT?:  number
  creeFrais:   boolean
}

const KEYS = {
  all:    () => ['mouvementsStock'] as const,
  list:   (period: MvtPeriod, articleId?: string) =>
    ['mouvementsStock', 'list', period, articleId ?? ''] as const,
}

export function useMouvements(period: MvtPeriod, articleId?: string) {
  return useQuery({
    queryKey: KEYS.list(period, articleId),
    queryFn:  () => {
      const params = new URLSearchParams({ period })
      if (articleId) params.set('articleId', articleId)
      return api.get<MouvementStock[]>(`/mouvements-stock?${params}`)
    },
  })
}

export function useCreateMouvement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateMouvementPayload) => api.post('/mouvements-stock', p),
    onSuccess:  () => {
      qc.refetchQueries({ queryKey: ['articles'] })
      qc.refetchQueries({ queryKey: KEYS.all() })
    },
  })
}
