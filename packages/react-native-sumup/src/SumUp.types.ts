/** Résultat d'un paiement SumUp */
export interface CheckoutResult {
  success: boolean
  transactionCode?: string  // code de transaction SumUp (succès)
  amount?: number           // montant effectif débité
  currency?: string         // devise (EUR, etc.)
  errorCode?: string        // code d'erreur SumUp (échec)
  message?: string          // message lisible (échec ou succès)
}

/** Types de terminaux supportés */
export type SumUpTerminalType = 'air' | 'solo'

/** État du terminal SumUp */
export type SumUpState =
  | 'not_initialized'
  | 'initialized'
  | 'logged_in'
  | 'ready'
  | 'checkout_in_progress'
