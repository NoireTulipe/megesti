export interface Auteur {
  id:         string
  prenom:     string
  nom:        string
  pseudonyme: string | null
  email:      string | null
  bio:        string | null
  actif:      boolean
}

export interface LivreAuteur {
  ordre:  number
  auteur: Pick<Auteur, 'id' | 'prenom' | 'nom' | 'pseudonyme'>
}

export interface Livre {
  id:              string
  titre:           string
  isbn:            string | null
  prix:            string        // Decimal sérialisé en string par Prisma
  datePublication: string | null
  description:     string | null
  couvertureUrl:   string | null
  stock:           number
  actif:           boolean
  auteurs:         LivreAuteur[]
}

export interface CreateLivrePayload {
  id:              string
  titre:           string
  isbn?:           string
  prix:            number
  datePublication?: string
  description?:    string
  couvertureUrl?:  string
  stock?:          number
  auteurIds:       string[]
}
