import { api } from '@/lib/api'

export interface BnfLivreInfo {
  isbn:             string
  titre:            string
  auteursMention:   string | null
  editeur:          string | null
  lieuPublication:  string | null
  anneePublication: number | null
  collection:       string | null
  collectionVolume: string | null
  resume:           string | null
  imageUrl:         string | null
  prixTTC:          number | null
  prixVenteHT:      number | null
}

export async function fetchBnfIsbn(isbn: string): Promise<BnfLivreInfo | null> {
  try {
    return await api.get<BnfLivreInfo>(`/bnf/isbn/${encodeURIComponent(isbn)}`)
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null
    throw err
  }
}
