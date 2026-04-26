import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ModePaiement = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT'
export type StatutVente  = 'VALIDEE' | 'ANNULEE'

export interface LigneVente {
  id:             string
  articleId:      string
  quantite:       number
  prixUnitaireHT: string
  tauxTVA:        string
  totalLigneHT:   string
  totalLigneTTC:  string
  article:        { id: string; nom: string; reference?: string | null }
}

export interface Vente {
  id:           string
  sessionId:    string
  numero:       number
  dateVente:    string
  modePaiement: ModePaiement
  totalHT:      string
  totalTVA:     string
  totalTTC:     string
  statut:       StatutVente
  lignes:       LigneVente[]
}

export interface CartLigne {
  articleId:      string
  nom:            string
  prixUnitaireHT: number
  tauxTVA:        number
  quantite:       number
}

const KEYS = {
  all:     () => ['ventes'] as const,
  session: (sessionId: string) => ['ventes', 'session', sessionId] as const,
}

export function useVentes(sessionId?: string) {
  return useQuery({
    queryKey: KEYS.session(sessionId ?? ''),
    queryFn:  () => api.get<Vente[]>(`/ventes${sessionId ? `?sessionId=${sessionId}` : ''}`),
    enabled:  !!sessionId,
  })
}

export function useCreateVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: string; sessionId: string; modePaiement: ModePaiement; lignes: { articleId: string; quantite: number }[] }) =>
      api.post<Vente>('/ventes', p),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.session(vars.sessionId) })
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useAnnulerVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, noteAnnulation }: { id: string; noteAnnulation?: string }) =>
      api.patch<Vente>(`/ventes/${id}/annuler`, { noteAnnulation }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
