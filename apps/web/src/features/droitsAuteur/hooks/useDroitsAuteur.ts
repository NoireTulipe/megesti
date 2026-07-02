import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SoldeContrat {
  contratId:         string
  auteurId:          string
  auteurNom:         string
  articleId:         string | null
  articleNom:        string | null
  periodicite:       string | null
  prochainVersement: string | null
  totalDuBrut:       number
  avance:            number
  avanceAbsorbee:    number
  avanceRestante:    number
  totalVerse:        number
  solde:             number
}

export interface EcheanceItem {
  contratId:         string
  auteur:            { id: string; prenom: string; nom: string }
  article:           { id: string; nom: string } | null
  typeDA:            string
  periodicite:       string | null
  prochainVersement: string | null
  solde:             number
}

export interface PaiementDA {
  id:               string
  contratId:        string
  auteurId:         string
  montant:          string
  dateVersement:    string
  dateDebutPeriode: string
  dateFinPeriode:   string
  statut:           'PREVU' | 'PAYE' | 'ANNULE'
  modePaiement:     string | null
  reference:        string | null
  notes:            string | null
  auteur:           { id: string; prenom: string; nom: string }
  contrat:          { id: string; article: { id: string; nom: string } | null }
}

export interface CreatePaiementPayload {
  id:               string
  contratId:        string
  montant:          number
  dateVersement:    string
  dateDebutPeriode: string
  dateFinPeriode:   string
  modePaiement?:    'VIREMENT' | 'CHEQUE'
  reference?:       string
  notes?:           string
}

export interface StatAuteur {
  auteur: { id: string; prenom: string; nom: string }
  total:  number
}

const KEYS = {
  soldes:    ['droits-auteur', 'soldes']    as const,
  calendrier:['droits-auteur', 'calendrier'] as const,
  historique:['droits-auteur', 'historique'] as const,
  stats:     ['droits-auteur', 'stats']     as const,
}

export function useSoldesDroitsAuteur() {
  return useQuery({
    queryKey: KEYS.soldes,
    queryFn:  () => api.get<SoldeContrat[]>('/droits-auteur'),
  })
}

export function useCalendrierDroitsAuteur() {
  return useQuery({
    queryKey: KEYS.calendrier,
    queryFn:  () => api.get<EcheanceItem[]>('/droits-auteur/calendrier'),
  })
}

export function useHistoriquePaiements(auteurId?: string) {
  return useQuery({
    queryKey: [...KEYS.historique, auteurId ?? ''],
    queryFn:  () => api.get<PaiementDA[]>(`/droits-auteur/historique${auteurId ? `?auteurId=${auteurId}` : ''}`),
  })
}

export function useStatsDroitsAuteur() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  () => api.get<StatAuteur[]>('/droits-auteur/stats'),
  })
}

export interface AlerteContrat {
  id:                string
  prochainVersement: string
  auteur:            { id: string; prenom: string; nom: string }
  article:           { id: string; nom: string } | null
}

export interface AlertesDA {
  retard:  AlerteContrat[]
  bientot: AlerteContrat[]
}

export function useAlertesDA() {
  return useQuery({
    queryKey: ['droits-auteur', 'alertes'],
    queryFn:  () => api.get<AlertesDA>('/droits-auteur/alertes'),
  })
}

export function useCreatePaiementDA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreatePaiementPayload) => api.post<PaiementDA>('/droits-auteur/paiements', p),
    meta: { successMessage: 'Paiement enregistré' },
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['droits-auteur'] })
    },
  })
}

export function usePatchPaiementDA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; statut: 'PAYE' | 'ANNULE' }) =>
      api.patch<PaiementDA>(`/droits-auteur/paiements/${id}`, data),
    meta: { successMessage: 'Paiement mis à jour' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['droits-auteur'] }),
  })
}
