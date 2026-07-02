import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ModePaiement = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP' | 'PDV'
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
  id:             string
  sessionId:      string | null
  motifVenteId:   string | null
  motifVente:     { id: string; libelle: string } | null
  numero:         number
  dateVente:      string
  modePaiement:   ModePaiement
  totalHT:        string
  totalTVA:       string
  totalTTC:       string
  statut:         StatutVente
  lignes:         LigneVente[]
}

export interface CartLigne {
  articleId:      string
  nom:            string
  prixUnitaireHT: number
  prixEffectif?:  number
  tauxTVA:        number
  quantite:       number
}

const KEYS = {
  all:         () => ['ventes'] as const,
  session:     (sessionId: string) => ['ventes', 'session', sessionId] as const,
  horsSession: () => ['ventes', 'hors-session'] as const,
}

export function useVentes(sessionId?: string) {
  return useQuery({
    queryKey: KEYS.session(sessionId ?? ''),
    queryFn:  () => api.get<Vente[]>(`/ventes${sessionId ? `?sessionId=${sessionId}` : ''}`),
    enabled:  !!sessionId,
  })
}

export function useVentesHorsSession(from?: string, to?: string) {
  return useQuery({
    queryKey: [...KEYS.horsSession(), from ?? '', to ?? ''],
    queryFn:  () => {
      const params = new URLSearchParams({ horsSession: 'true' })
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      return api.get<Vente[]>(`/ventes?${params}`)
    },
  })
}

export function useCreateVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: {
      id:           string
      sessionId:    string
      modePaiement: ModePaiement
      lignes: { articleId: string; quantite: number; prixUnitaireHT?: number }[]
    }) => api.post<Vente>('/ventes', p),
    meta: { successMessage: 'Vente enregistrée' },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.session(vars.sessionId) })
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useCreateVenteHorsSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: {
      id:           string
      motifVenteId: string
      modePaiement: ModePaiement
      lignes: { articleId: string; quantite: number; prixUnitaireHT?: number }[]
    }) => api.post<Vente>('/ventes', { ...p, sessionId: null }),
    meta: { successMessage: 'Vente enregistrée' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.horsSession() })
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['bilan'] })
    },
  })
}

export function useAnnulerVente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, noteAnnulation }: { id: string; noteAnnulation?: string }) =>
      api.patch<Vente>(`/ventes/${id}/annuler`, { noteAnnulation }),
    meta: { successMessage: 'Vente annulée' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
