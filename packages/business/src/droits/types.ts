export type VendeurType  = 'AUTEUR' | 'ME'
export type TypeVente    = 'DIRECTE' | 'DEPOT' | 'SALON'
export type BaseCalcul   = 'HT' | 'TTC'

export interface ContexteVente {
  vendeur:        VendeurType
  avecCommission: boolean
  typeVente?:     TypeVente
}

export interface ConditionRegle {
  vendeur?:        VendeurType
  avecCommission?: boolean
  typeVente?:      TypeVente
}

export interface RegleDA {
  conditions: ConditionRegle  // {} = s'applique toujours (fallback)
  taux:       number          // 0–100
  base:       BaseCalcul
}

export interface FormuleDA {
  lignes: RegleDA[]           // évaluées dans l'ordre, première correspondance gagne
}

export interface LigneVenteDA {
  articleId:      string
  quantite:       number
  totalLigneHT:   number
  totalLigneTTC:  number
}

export interface ResultatRoyalties {
  taux:              number
  base:              BaseCalcul
  montantBrut:       number   // avant recoupement à-valoir
  avanceRecoupee:    number   // montant déduit de l'à-valoir ce calcul
  avanceRestante:    number   // à-valoir restant après ce calcul
  montantNet:        number   // ce qui est réellement dû à l'auteur
  lignes:            Array<{ articleId: string; montant: number }>
}
