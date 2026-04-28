import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ContactSalon {
  id:        string
  nom:       string
  prenom:    string | null
  email:     string | null
  telephone: string | null
}

export interface TypeSalon {
  id:      string
  libelle: string
}

export interface SalonSession {
  id:     string
  statut: string
  ventes: Array<{ totalTTC: string; statut: string }>
}

export interface Salon {
  id:                string
  nom:               string
  typeSalonId:       string | null
  typeSalon:         TypeSalon | null
  lieu:              string | null
  adresse:           string | null
  ville:             string | null
  pays:              string | null
  dateDebut:         string | null
  dateFin:           string | null
  dureeJours:        number | null
  periodeHabituelle: string | null
  prixPrevuFixe:     string | null
  prixPrevuPct:      string | null
  note:              number | null
  commentaires:      string | null
  actif:             boolean
  contacts:          ContactSalon[]
  sessions:          SalonSession[]
  pointDeVente:      { id: string; actif: boolean } | null
}

export interface CreateSalonPayload {
  id:                  string
  nom:                 string
  typeSalonId?:        string
  lieu?:               string
  adresse?:            string
  ville?:              string
  pays?:               string
  dateDebut?:          string
  dateFin?:            string
  dureeJours?:         number
  periodeHabituelle?:  string
  prixPrevuFixe?:      number
  prixPrevuPct?:       number
  note?:               number
  commentaires?:       string
  contacts?:           Array<{ id: string; nom: string; prenom?: string; email?: string; telephone?: string }>
  creerPointDeVente?:  boolean
}

export function salonCA(salon: Salon): number {
  return salon.sessions
    .flatMap((s) => s.ventes)
    .filter((v) => v.statut === 'VALIDEE')
    .reduce((sum, v) => sum + Number(v.totalTTC), 0)
}

const KEYS = {
  all:  () => ['salons'] as const,
  list: (q?: string) => ['salons', 'list', q ?? ''] as const,
}

export function useSalons(q?: string) {
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn:  () => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : ''
      return api.get<Salon[]>(`/salons${qs}`)
    },
  })
}

export function useCreateSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSalonPayload) => api.post<Salon>('/salons', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useUpdateSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateSalonPayload> & { id: string }) =>
      api.patch<Salon>(`/salons/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}

export function useDeleteSalon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/salons/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  })
}
