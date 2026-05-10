import { Platform, NativeModules } from 'react-native'
import type { CheckoutResult } from './SumUp.types'

// Le module natif — undefined sous Expo Go
const NativeSumUp = NativeModules['SumUp' as any] as
  | {
      init(affiliateKey: string): Promise<boolean>
      login(token: string): Promise<boolean>
      checkout(amount: number, currency: string, title: string): Promise<CheckoutResult>
      isReady(): Promise<boolean>
      logout(): Promise<void>
    }
  | undefined

// ─── API publique (noop graceful) ────────────────────────────────────

export const SumUp = {
  /** Le module natif est-il disponible ? */
  isAvailable(): boolean {
    return NativeSumUp != null
  },

  /** Terminal actuellement connecté ? */
  async init(affiliateKey: string): Promise<boolean> {
    if (!NativeSumUp) {
      console.warn('[SumUp] Module natif non disponible (Expo Go ou plateforme non supportée)')
      return false
    }
    return NativeSumUp.init(affiliateKey)
  },

  /** Connexion du marchand avec un token d'accès */
  async login(token: string): Promise<boolean> {
    if (!NativeSumUp) {
      console.warn('[SumUp] Module natif non disponible')
      return false
    }
    return NativeSumUp.login(token)
  },

  /** Déclencher un paiement sur le terminal */
  async checkout(amount: number, currency = 'EUR', title = 'Achat MeGesti'): Promise<CheckoutResult> {
    if (!NativeSumUp) {
      return {
        success: false,
        errorCode: 'NO_MODULE',
        message: Platform.select({
          ios: 'SumUp non disponible. Utilisez une build native (expo run:ios).',
          android: 'SumUp non disponible. Utilisez une build native (expo run:android).',
          default: 'SumUp non disponible.',
        }),
      }
    }
    return NativeSumUp.checkout(amount, currency, title)
  },

  /** Le terminal est-il prêt à encaisser ? */
  async isReady(): Promise<boolean> {
    if (!NativeSumUp) return false
    return NativeSumUp.isReady()
  },

  /** Déconnexion du marchand */
  async logout(): Promise<void> {
    if (!NativeSumUp) return
    return NativeSumUp.logout()
  },
}

export type { CheckoutResult, SumUpTerminalType, SumUpState } from './SumUp.types'
