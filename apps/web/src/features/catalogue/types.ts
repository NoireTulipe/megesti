export interface Rayon {
  id:          string
  nom:         string
  ordre:       number
  isLibrairie: boolean
  tauxTVA:     string   // Decimal sérialisé
  categories:  Categorie[]
}

export interface Categorie {
  id:      string
  rayonId: string
  nom:     string
  ordre:   number
}

export interface ArticleAuteur {
  ordre:  number
  auteur: { id: string; prenom: string; nom: string; pseudonyme: string | null }
}

export interface Article {
  id:              string
  rayonId:         string
  categorieId:     string | null
  nom:             string
  reference:       string | null
  description:     string | null
  imageUrl:        string | null
  prixVenteHT:     string   // Decimal sérialisé par Prisma
  prixAchatHT:     string | null
  prixAchatLotHT:  string | null
  prixAchatLotQte: number | null
  stock:           number
  stockAlerte:     number
  stockTension:    number
  actif:           boolean
  isbn:            string | null
  datePublication: string | null
  rayon:           Rayon
  categorie:       Categorie | null
  auteurs:         ArticleAuteur[]
}

export interface CreateArticlePayload {
  id:               string
  rayonId:          string
  categorieId?:     string | null
  nom:              string
  reference?:       string | null
  description?:     string | null
  imageUrl?:        string | null
  prixVenteHT:      number
  prixAchatHT?:     number | null
  prixAchatLotHT?:  number | null
  prixAchatLotQte?: number | null
  stock?:           number
  stockAlerte?:     number
  stockTension?:    number
  isbn?:            string | null
  datePublication?: string | null
  auteurIds:        string[]
}
