import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type TypeFrais = 'DON' | 'PERTE_STOCK' | 'DEPLACEMENT' | 'REPAS' | 'HEBERGEMENT' | 'STAND' | 'AUTRE'

export const TYPE_FRAIS_LABELS: Record<TypeFrais, string> = {
  DON:          'Don',
  PERTE_STOCK:  'Perte stock',
  DEPLACEMENT:  'Déplacement',
  REPAS:        'Repas',
  HEBERGEMENT:  'Hébergement',
  STAND:        'Stand / Location',
  AUTRE:        'Autre',
}

export const TYPE_FRAIS_EMOJI: Record<TypeFrais, string> = {
  DON:          '🎁',
  PERTE_STOCK:  '📦',
  DEPLACEMENT:  '🚗',
  REPAS:        '🍽️',
  HEBERGEMENT:  '🏨',
  STAND:        '🎪',
  AUTRE:        '📋',
}

export interface Frais {
  id:        string
  sessionId: string | null
  type:      TypeFrais
  motif:     string
  montantHT: string | null
  date:      string
}

export interface CreateFraisPayload {
  id:        string
  sessionId?: string
  type:      TypeFrais
  motif:     string
  montantHT?: number
}

const KEYS = {
  all:     () => ['frais'] as const,
  session: (id: string) => ['frais', 'session', id] as const,
}

export function useFraisSession(sessionId: string | null) {
  return useQuery({
    queryKey: KEYS.session(sessionId ?? ''),
    queryFn:  () => api.get<Frais[]>(`/frais?sessionId=${sessionId}`),
    enabled:  Boolean(sessionId),
  })
}

export function useCreateFrais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateFraisPayload) => api.post<Frais>('/frais', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteFrais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/frais/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
