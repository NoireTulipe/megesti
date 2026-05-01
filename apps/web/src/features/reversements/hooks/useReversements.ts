import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type StatutReversement = 'EN_ATTENTE' | 'ENCAISSE' | 'ANNULE'
export type TypePaiementRemise = 'VIREMENT' | 'CHEQUE'

export interface Reversement {
  id:               string
  pointDeVenteId:   string
  sessionId:        string
  montantTTC:       string
  nbVentes:         number
  statut:           StatutReversement
  dateCloture:      string
  dateEncaissement: string | null
  modePaiement:     TypePaiementRemise | null
  reference:       string | null
  notes:           string | null
  montantAjuste:   string | null
  noteAjustement:  string | null
  pointDeVente: {
    id:                 string
    nom:                string
    commissionPourcent: string | null
    commissionFixe:     string | null
  }
  session: {
    id:            string
    nom:           string | null
    dateOuverture: string
    dateFermeture: string | null
  }
}

export interface TotauxReversements {
  enAttente: { montant: number; nb: number }
  encaisse:  { montant: number }
}

const KEYS = {
  all:    () => ['reversements'] as const,
  list:   (statut?: string) => ['reversements', 'list', statut ?? ''] as const,
  totaux: () => ['reversements', 'totaux'] as const,
}

export function useReversements(statut?: StatutReversement) {
  return useQuery({
    queryKey: KEYS.list(statut),
    queryFn:  () => api.get<Reversement[]>(`/reversements${statut ? `?statut=${statut}` : ''}`),
  })
}

export function useTotauxReversements() {
  return useQuery({
    queryKey: KEYS.totaux(),
    queryFn:  () => api.get<TotauxReversements>('/reversements/totaux'),
    staleTime: 30_000,
  })
}

export interface EncaisserPayload {
  modePaiement:     TypePaiementRemise
  dateEncaissement?: string
  reference?:       string
  notes?:           string
}

export function useEncaisserReversement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: EncaisserPayload & { id: string }) =>
      api.patch<Reversement>(`/reversements/${id}/encaisser`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useAjusterReversement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, montantAjuste, noteAjustement }: { id: string; montantAjuste: number; noteAjustement: string }) =>
      api.patch<Reversement>(`/reversements/${id}/ajuster`, { montantAjuste, noteAjustement }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useAnnulerReversement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<Reversement>(`/reversements/${id}/annuler`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
