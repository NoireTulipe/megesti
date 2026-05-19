// ── Types partagés facturation électronique ──────────────────────────────────

export type FormatFacture = 'ubl' | 'factur-x' | 'cii'

export interface LigneFacture {
  description:    string
  quantite:       number
  prixUnitaireHT: number
  tauxTVA:        number   // ex. 5.5 ou 20
}

export interface FacturePayload {
  numero:           string
  dateEmission:     Date
  dateEcheance?:    Date
  destinataireSiret?: string
  destinataireNom?:   string
  destinataireAdresse?: string
  lignes:           LigneFacture[]
  format:           FormatFacture
}

export interface EmissionResult {
  pdpId:  string
  statut: string
}

export interface FactureRecueBrute {
  id:            string | number
  created_at:    string
  sender_name?:  string
  sender_siren?: string
  total_amount?: number | string
  [key: string]: unknown
}

export interface EvenementFactureBrut {
  id:           string | number
  invoice_id:   string | number
  status_code:  string
  created_at:   string
  [key: string]: unknown
}

export interface PagePdp<T> {
  data:      T[]
  has_after: boolean
}

// ── Interface d'abstraction PDP ───────────────────────────────────────────────
// Toute implémentation concrète (superpdp, autre PDP) doit respecter ce contrat.

export interface InvoiceTransmissionService {
  /** Envoie une facture et retourne l'ID PDP et le statut initial */
  emettre(xmlContent: string): Promise<EmissionResult>

  /** Liste les factures reçues depuis un ID donné (polling) */
  listerRecu(sinceId?: string): Promise<FactureRecueBrute[]>

  /** Télécharge le contenu brut d'une facture par son ID PDP */
  telecharger(pdpId: string): Promise<string>

  /** Envoie un événement de statut (acceptation, refus) */
  envoyerStatut(pdpId: string, codeStatut: string): Promise<void>
}
