import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BilanPnl {
  caHT:              number
  caTTC:             number
  coutDesVentes:     number
  totalFrais:        number
  totalChargesPayees: number
  totalDroits:       number
  resultatNet:       number
}

export interface BilanData {
  periode: { from: string; to: string }
  pnl: BilanPnl
  entreesEffectives: {
    ventesDirectes:        number
    ventesHorsSession:     number
    reversementsEncaisses: number
    total: number
    detail: {
      ventesParMode:  { mode: string; ca: number; nb: number }[]
      ventesParMotif: { motifVenteId: string; libelle: string; ca: number; nb: number }[]
      reversements:   { pdvNom: string; montant: number; dateEncaissement: string | null }[]
    }
  }
  sortiesEffectives: {
    frais:                   number
    charges:                 number
    droitsAuteursPaies:      number
    commissionsReversements: number
    parCategorie: {
      ACHATS: number; SERVICES: number; IMPOTS_TAXES: number
      AUTRES_CHARGES: number; CHARGES_EXCEPT: number
    }
    total: number
    detail: {
      frais:   { type: string; motif: string; montantHT: number; date: string }[]
      charges: { libelle: string; montantHT: number; type: string; categorie: string; date: string | null }[]
      droitsAuteursPaies:      { auteurId: string; nomAuteur: string; montant: number }[]
      commissionsReversements: { pdvNom: string; montantBrut: number; commission: number }[]
    }
  }
  entreesPrevues: {
    reversementsEnAttente: number
    total: number
    detail: { pdvNom: string; montant: number; commission: number; dateCloture: string }[]
  }
  sortiesPrevues: {
    droitsAuteurs:           number
    chargesAVenir:           number
    commissionsReversements: number
    total:                   number
    detail: {
      droits:  { auteurId: string; nomAuteur: string; montantNet: number; montantBrut: number }[]
      charges: { id: string; libelle: string; montantHT: number; type: string; periodicite: string | null; prochaineEcheance: string | null }[]
    }
  }
  stock: { valeurEstimee: number; nbArticles: number }
  bilan: {
    actif:  { stock: number; creancesClients: number; tresorerie: number; total: number }
    passif: { droitsAuteurs: number; chargesAPayer: number; resultatNet: number; total: number }
  }
}

export function useBilan(from: string, to: string) {
  return useQuery<BilanData>({
    queryKey: ['bilan', from, to],
    queryFn:  () => api.get<BilanData>(`/rapports/bilan?from=${from}&to=${to}`),
    staleTime: 60_000,
  })
}
