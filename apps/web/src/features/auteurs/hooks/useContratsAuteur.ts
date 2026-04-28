import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ContratAuteur {
  id:               string
  auteurId:         string
  typeDAId:         string
  articleId:        string | null
  avance:           string | null
  avanceDue:        string
  dateSignature:    string | null
  datePriseEffet:   string | null
  dureeAns:         number | null
  reconduiteTacite: boolean
  actif:            boolean
  typeDA:           { id: string; nom: string }
  article:          { id: string; nom: string } | null
}

export interface CreateContratPayload {
  id:               string
  auteurId:         string
  typeDAId:         string
  articleId?:       string
  avance?:          number
  dateSignature?:   string   // ISO datetime
  datePriseEffet?:  string
  dureeAns?:        number
  reconduiteTacite?: boolean
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

const KEY = ['contrats-auteur'] as const

export function useContratsAuteur(auteurId?: string) {
  return useQuery({
    queryKey: [...KEY, auteurId ?? ''],
    queryFn:  () => api.get<ContratAuteur[]>(`/contrats-auteur?auteurId=${auteurId}`),
    enabled:  !!auteurId,
  })
}

export function useCreateContratAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateContratPayload) => api.post<ContratAuteur>('/contrats-auteur', p),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteContratAuteur() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contrats-auteur/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
