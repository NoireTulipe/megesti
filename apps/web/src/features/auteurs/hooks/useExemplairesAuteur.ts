import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { generateUUID } from '@/lib/utils'

export interface LigneExemplaire {
  id:             string
  articleId:      string
  quantite:       number
  prixUnitaireHT: string
  totalLigneHT:   string
  totalLigneTTC:  string
  article:        { id: string; nom: string; reference?: string | null }
}

export interface VenteExemplaire {
  id:            string
  numero:        number
  dateVente:     string
  modePaiement:  string
  totalHT:       string
  totalTTC:      string
  statut:        string
  lignes:        LigneExemplaire[]
}

export interface CreateVenteExemplairePayload {
  auteurId:     string
  modePaiement: 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP'
  lignes: {
    articleId:      string
    quantite:       number
    prixUnitaireHT: number
  }[]
}

const KEY = (auteurId: string) => ['ventes-exemplaires', auteurId] as const

export function useVentesExemplaires(auteurId?: string) {
  return useQuery({
    queryKey: auteurId ? KEY(auteurId) : ['ventes-exemplaires-disabled'],
    queryFn:  () => api.get<VenteExemplaire[]>(`/ventes?auteurId=${auteurId}`),
    enabled:  !!auteurId,
  })
}

export function useCreateVenteExemplaire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ auteurId, ...rest }: CreateVenteExemplairePayload) =>
      api.post<VenteExemplaire>('/ventes/exemplaires-auteur', { id: generateUUID(), auteurId, ...rest }),
    meta: { successMessage: "Vente d'exemplaires enregistrée" },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY(vars.auteurId) })
      // Invalider le stock des articles
      qc.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
