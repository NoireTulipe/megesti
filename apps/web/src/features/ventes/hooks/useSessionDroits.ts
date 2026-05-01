import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DroitAuteur {
  auteurId:       string
  nomAuteur:      string
  taux:           number
  base:           'HT' | 'TTC'
  montantBrut:    number
  avanceRecoupee: number
  avanceRestante: number
  montantNet:     number
}

export interface SessionDroits {
  auteurs:   DroitAuteur[]
  totalNet:  number
  totalBrut: number
  contexte:  { vendeur: string; avecCommission: boolean; typeVente?: string }
}

export function useSessionDroits(sessionId: string | null) {
  return useQuery<SessionDroits>({
    queryKey: ['session-droits', sessionId],
    queryFn:  () => api.get<SessionDroits>(`/sessions-caisse/${sessionId}/droits`),
    enabled:  !!sessionId,
    staleTime: 30_000,
  })
}
