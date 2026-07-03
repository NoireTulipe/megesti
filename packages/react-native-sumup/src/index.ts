import { Platform, NativeModules } from 'react-native'
import type { CheckoutResult } from './SumUp.types'

const NativeSumUp = NativeModules['SumUp' as any] as
  | {
      init(affiliateKey: string): Promise<boolean>
      isReady(): Promise<boolean>
      getAccessToken(): Promise<string | null>
      login(accessToken?: string | null): Promise<boolean>
      checkout(amount: number, currency: string, title: string): Promise<CheckoutResult>
      logout(): Promise<void>
    }
  | undefined

// ─── API publique (noop graceful si module absent) ───────────────────

export const SumUp = {
  isAvailable(): boolean {
    return NativeSumUp != null
  },

  async init(affiliateKey: string): Promise<boolean> {
    if (!NativeSumUp) return false
    return NativeSumUp.init(affiliateKey)
  },

  async isReady(): Promise<boolean> {
    if (!NativeSumUp) return false
    return NativeSumUp.isReady()
  },

  /** Récupère l'access token SumUp courant (null si non connecté). */
  async getAccessToken(): Promise<string | null> {
    if (!NativeSumUp) return null
    return NativeSumUp.getAccessToken()
  },

  /**
   * Connexion SumUp.
   * @param accessToken si fourni, tente un login transparent (sans écran).
   *                    Sinon, ouvre l'écran SumUp natif (saisie identifiants).
   * Aucun identifiant marchand ne transite par les serveurs MeGesti.
   */
  async login(accessToken?: string | null): Promise<boolean> {
    if (!NativeSumUp) {
      console.warn('[SumUp] Module natif non disponible — build native requise')
      return false
    }
    return NativeSumUp.login(accessToken ?? null)
  },

  async checkout(amount: number, currency = 'EUR', title = 'Achat MeGesti'): Promise<CheckoutResult> {
    if (!NativeSumUp) {
      return {
        success: false,
        errorCode: 'NO_MODULE',
        message: Platform.select({
          android: 'SumUp non disponible. Utilisez une build native.',
          ios:     'SumUp non disponible. Utilisez une build native.',
          default: 'SumUp non disponible.',
        }),
      }
    }
    return NativeSumUp.checkout(amount, currency, title)
  },

  async logout(): Promise<void> {
    if (!NativeSumUp) return
    return NativeSumUp.logout()
  },
}

export type { CheckoutResult, SumUpTerminalType, SumUpState } from './SumUp.types'
