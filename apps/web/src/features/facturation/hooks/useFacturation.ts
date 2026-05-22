import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatutEmission = 'BROUILLON' | 'ENVOYEE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'

export interface QuotaInfo {
  quotaMois:    number
  emisesCeMois: number
  creditsSupp:  number
  restant:      number
}

export interface FactureEmission {
  id:                string
  numero:            string
  statut:            StatutEmission
  destinataireSiret: string | null
  destinataireNom:   string | null
  montantHT:         string
  montantTVA:        string
  montantTTC:        string
  format:            string
  pdpId:             string | null
  dateEmission:      string
  dateEcheance:      string | null
  createdAt:         string
}

export interface FactureReception {
  id:             string
  pdpId:          string
  emetteurSiret:  string | null
  emetteurNom:    string | null
  numeroFacture:  string | null
  montantTTC:     string
  dateReception:  string
  statut:         string
  lu:             boolean
  contenuXml:     string | null
  createdAt:      string
}

export interface PackCredit {
  id:         string
  credits:    number
  label:      string
  unitAmount: number
  prixEuros:  number
}

export interface PdpConfig {
  pdpClientId:  string | null
  pdpConfigured:boolean
  siret:        string | null
  adresseLigne1:string | null
  adresseLigne2:string | null
  codePostal:   string | null
  ville:        string | null
  pays:         string | null
  numeroTVA:    string | null
}

export interface LigneEmission {
  description:    string
  quantite:       number
  prixUnitaireHT: number
  tauxTVA:        number
}

export interface CreateEmissionPayload {
  id:                  string
  numero:              string
  dateEmission:        string
  dateEcheance?:       string | null
  destinataireSiret?:  string | null
  destinataireNom?:    string | null
  destinataireAdresse?:string | null
  lignes:              LigneEmission[]
}

// ── Quota ──────────────────────────────────────────────────────────────────────

export function useQuota() {
  return useQuery({
    queryKey: ['facturation', 'quota'],
    queryFn:  () => api.get<QuotaInfo>('/facturation/quota'),
    refetchInterval: 60_000,
  })
}

// ── Prochain numéro ────────────────────────────────────────────────────────────

export function useProchainNumero() {
  return useQuery({
    queryKey: ['facturation', 'prochain-numero'],
    queryFn:  () => api.get<{ numero: string }>('/facturation/prochain-numero'),
  })
}

// ── Émissions ─────────────────────────────────────────────────────────────────

export function useEmissions(page = 1) {
  return useQuery({
    queryKey: ['facturation', 'emissions', page],
    queryFn:  () => api.get<FactureEmission[]>(`/facturation/emissions?page=${page}`),
  })
}

export function useCreateEmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEmissionPayload) => api.post<FactureEmission>('/facturation/emissions', payload),
    // onSettled : invalide même si l'envoi PDP échoue (le BROUILLON doit apparaître)
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['facturation'] })
    },
  })
}

export function useRetryEmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<FactureEmission>(`/facturation/emissions/${id}/emettre`, {}),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['facturation'] })
    },
  })
}

// ── Réceptions ────────────────────────────────────────────────────────────────

export function useReceptions(lu?: boolean) {
  return useQuery({
    queryKey: ['facturation', 'receptions', lu],
    queryFn:  () => api.get<FactureReception[]>(`/facturation/receptions${lu !== undefined ? `?lu=${lu}` : ''}`),
  })
}

export function useNonLusCount() {
  return useQuery({
    queryKey:       ['facturation', 'non-lus'],
    queryFn:        () => api.get<{ count: number }>('/facturation/receptions/non-lus'),
    refetchInterval: 5 * 60_000,
  })
}

export function useMarquerLu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<FactureReception>(`/facturation/receptions/${id}/lu`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['facturation', 'receptions'] }),
  })
}

// ── Config PDP ────────────────────────────────────────────────────────────────

export function usePdpConfig() {
  return useQuery({
    queryKey: ['facturation', 'config'],
    queryFn:  () => api.get<PdpConfig>('/facturation/config'),
  })
}

export function useSavePdpConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PdpConfig> & { pdpClientSecret?: string }) =>
      api.patch('/facturation/config', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturation', 'config'] }),
  })
}

// ── Stripe packs ──────────────────────────────────────────────────────────────

export function usePacks() {
  return useQuery({
    queryKey: ['stripe', 'packs'],
    queryFn:  () => api.get<PackCredit[]>('/stripe/packs'),
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (packId: string) => {
      const { url } = await api.post<{ url: string }>('/stripe/checkout', { packId })
      window.location.href = url
    },
  })
}
