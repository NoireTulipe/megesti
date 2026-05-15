import { Platform, NativeModules } from 'react-native'
import type { CheckoutResult } from './SumUp.types'

const NativeSumUp = NativeModules['SumUp' as any] as
  | {
      init(affiliateKey: string): Promise<boolean>
      isReady(): Promise<boolean>
      login(): Promise<boolean>
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

  // La connexion ouvre l'écran de connexion SumUp natif directement sur l'appareil.
  // Aucun identifiant marchand ne transite par les serveurs MeGesti.
  async login(): Promise<boolean> {
    if (!NativeSumUp) {
      console.warn('[SumUp] Module natif non disponible — build native requise')
      return false
    }
    return NativeSumUp.login()
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
