import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type TypeCharge       = 'DEPENSE' | 'ABONNEMENT' | 'PERTE'
export type StatutCharge     = 'PREVU' | 'PAYE'
export type Periodicite      = 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE'
export type CategorieCharge  = 'ACHATS' | 'SERVICES' | 'IMPOTS_TAXES' | 'AUTRES_CHARGES' | 'CHARGES_EXCEPT'

export interface Charge {
  id:                string
  libelle:           string
  montantHT:         string
  tauxTVA:           string
  type:              TypeCharge
  categorie:         CategorieCharge
  statut:            StatutCharge
  dateEffet:         string
  datePaiement:      string | null
  periodicite:       Periodicite | null
  prochaineEcheance: string | null
  actif:             boolean
  notes:             string | null
}

export interface ChargeInput {
  id:                string
  libelle:           string
  montantHT:         number
  tauxTVA?:          number
  type:              TypeCharge
  categorie?:        CategorieCharge
  statut?:           StatutCharge
  dateEffet:         string
  datePaiement?:     string
  periodicite?:      Periodicite
  prochaineEcheance?: string
  notes?:            string
}

const KEY = ['charges']

export function useCharges() {
  return useQuery<Charge[]>({
    queryKey: KEY,
    queryFn:  () => api.get<Charge[]>('/charges'),
    staleTime: 30_000,
  })
}

export function useCreateCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChargeInput) => api.post<Charge>('/charges', body),
    meta: { successMessage: 'Charge enregistrée' },
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ChargeInput> & { id: string }) =>
      api.patch<Charge>(`/charges/${id}`, body),
    meta: { successMessage: 'Charge mise à jour' },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/charges/${id}`),
    meta: { successMessage: 'Charge supprimée' },
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const TYPE_CHARGE_LABELS: Record<TypeCharge, string> = {
  DEPENSE:    'Dépense',
  ABONNEMENT: 'Abonnement',
  PERTE:      'Perte',
}

export const TYPE_CHARGE_COLORS: Record<TypeCharge, string> = {
  DEPENSE:    '#C9933A',
  ABONNEMENT: '#8B7BAB',
  PERTE:      '#C85D3A',
}

// Labels et couleurs calés sur le PCG
export const CATEGORIE_CHARGE_LABELS: Record<CategorieCharge, string> = {
  ACHATS:          'Achats & production (60)',
  SERVICES:        'Services extérieurs (61-62)',
  IMPOTS_TAXES:    'Impôts & taxes (63)',
  AUTRES_CHARGES:  'Autres charges (65)',
  CHARGES_EXCEPT:  'Charges except. (67)',
}

export const CATEGORIE_CHARGE_COLORS: Record<CategorieCharge, string> = {
  ACHATS:          '#C9933A',  // gold
  SERVICES:        '#8B7BAB',  // mauve
  IMPOTS_TAXES:    '#3D5470',  // ink
  AUTRES_CHARGES:  '#C4907C',  // rose
  CHARGES_EXCEPT:  '#DC2626',  // rouge
}

/** Catégorie par défaut selon le type */
export function defaultCategorie(type: TypeCharge): CategorieCharge {
  if (type === 'ABONNEMENT') return 'SERVICES'
  if (type === 'PERTE')      return 'CHARGES_EXCEPT'
  return 'ACHATS'
}

export const PERIODICITE_LABELS: Record<Periodicite, string> = {
  MENSUELLE:      'Mensuel',
  TRIMESTRIELLE:  'Trimestriel',
  SEMESTRIELLE:   'Semestriel',
  ANNUELLE:       'Annuel',
}

// ── Helpers calendaires (miroir du backend) ───────────────────────────────────

export function addPeriode(d: Date, p: Periodicite): Date {
  const r = new Date(d)
  if (p === 'MENSUELLE')     r.setMonth(r.getMonth() + 1)
  if (p === 'TRIMESTRIELLE') r.setMonth(r.getMonth() + 3)
  if (p === 'SEMESTRIELLE')  r.setMonth(r.getMonth() + 6)
  if (p === 'ANNUELLE')      r.setFullYear(r.getFullYear() + 1)
  return r
}

/** Toutes les occurrences d'un abonnement dans [from, to] */
export function occurrencesDansPeriode(dateEffet: Date, periodicite: Periodicite, from: Date, to: Date): Date[] {
  const result: Date[] = []
  let cur = new Date(dateEffet)
  while (cur <= to) {
    if (cur >= from) result.push(new Date(cur))
    cur = addPeriode(cur, periodicite)
  }
  return result
}

/** Détermine si une charge ponctuelle tombe dans la période */
export function chargeEstDansPeriode(c: Charge, from: Date, to: Date): boolean {
  if (c.type === 'ABONNEMENT') {
    if (!c.periodicite) return false
    return occurrencesDansPeriode(new Date(c.dateEffet), c.periodicite, from, to).length > 0
  }
  const dateRef = c.statut === 'PAYE' && c.datePaiement
    ? new Date(c.datePaiement)
    : new Date(c.dateEffet)
  return dateRef >= from && dateRef <= to
}
