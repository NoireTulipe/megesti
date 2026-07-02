import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PeriodiciteDA =
  | 'MENSUEL' | 'TRIMESTRIEL' | 'TOUS_LES_4_MOIS'
  | 'SEMESTRIEL' | 'ANNUEL' | 'DATES_FIXES'

export interface DateFixe { mois: number; jour: number }

export interface ContratAuteur {
  id:                string
  auteurId:          string
  typeDAId:          string
  articleId:         string | null
  avance:            string | null
  avanceDue:         string
  prixAuteurHT:      string | null
  dateSignature:     string | null
  datePriseEffet:    string | null
  dureeAns:          number | null
  reconduiteTacite:  boolean
  periodicite:       PeriodiciteDA | null
  datesFixesJSON:    DateFixe[] | null
  prochainVersement: string | null
  actif:             boolean
  typeDA:            { id: string; nom: string }
  article:           { id: string; nom: string } | null
}

export interface CreateContratPayload {
  id:                string
  auteurId:          string
  typeDAId:          string
  articleId?:        string
  avance?:           number
  prixAuteurHT?:     number
  dateSignature?:    string   // ISO datetime
  datePriseEffet?:   string
  dureeAns?:         number
  reconduiteTacite?: boolean
  periodicite?:      PeriodiciteDA | null
  datesFixesJSON?:   DateFixe[] | null
  prochainVersement?: string
}

/** Date de fin du contrat (null = indéterminée) */
export function contratDateFin(c: ContratAuteur): Date | null {
  if (!c.dureeAns) return null
  const base = c.datePriseEffet ?? c.dateSignature
  if (!base) return null
  const d = new Date(base)
  d.setFullYear(d.getFullYear() + c.dureeAns)
  return d
}

/** Prochaine date anniversaire (renouvellement) */
export function prochaineEcheance(c: ContratAuteur): Date | null {
  const fin = contratDateFin(c)
  if (!fin) return null
  const today = new Date()
  if (!c.reconduiteTacite) return fin

  // Trouver la prochaine date anniversaire à partir d'aujourd'hui
  let echeance = new Date(fin)
  while (echeance <= today) {
    echeance = new Date(echeance)
    echeance.setFullYear(echeance.getFullYear() + 1)
  }
  return echeance
}

export interface UpdateContratPayload {
  typeDAId?:         string
  articleId?:        string | null
  avance?:           number | null
  prixAuteurHT?:     number | null
  dateSignature?:    string
  datePriseEffet?:   string
  dureeAns?:         number | null
  reconduiteTacite?: boolean
  periodicite?:      PeriodiciteDA | null
  datesFixesJSON?:   DateFixe[] | null
  prochainVersement?: string | null
}

const KEY        = ['contrats-auteur'] as const
const AUTEUR_KEY = ['auteurs'] as const

export function useContratsAuteur(auteurId?: string) {
  return useQuery({
    queryKey: [...KEY, auteurId ?? ''],
    queryFn:  () => api.get<ContratAuteur[]>(`/contrats-auteur?auteurId=${auteurId}`),
    enabled:  !!auteurId,
  })
}

const DA_KEY = ['droits-auteur'] as const

export function useCreateContratAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateContratPayload) => api.post<ContratAuteur>('/contrats-auteur', p),
    meta: { successMessage: 'Contrat créé' },
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: AUTEUR_KEY })
      qc.invalidateQueries({ queryKey: DA_KEY })
    },
  })
}

export function useUpdateContratAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateContratPayload & { id: string }) =>
      api.patch<ContratAuteur>(`/contrats-auteur/${id}`, data),
    meta: { successMessage: 'Contrat mis à jour' },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: KEY })
      await qc.invalidateQueries({ queryKey: DA_KEY })
    },
  })
}

export function useDeleteContratAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contrats-auteur/${id}`),
    meta: { successMessage: 'Contrat supprimé' },
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: AUTEUR_KEY })
    },
  })
}

export function useAppliquerPeriodicite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contratId: string) =>
      api.post<{ updated: number }>(`/droits-auteur/contrats/${contratId}/appliquer-periodicite`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: DA_KEY })
    },
  })
}
