import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type PaymentMode = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'PAYPAL' | 'SUMUP'
export type SumUpTerminal = 'air' | 'solo'

export const ALL_PAYMENT_MODES: { mode: PaymentMode; label: string; emoji: string }[] = [
  { mode: 'CB',       label: 'CB',       emoji: '💳' },
  { mode: 'ESPECES',  label: 'Espèces',  emoji: '💶' },
  { mode: 'CHEQUE',   label: 'Chèque',   emoji: '📝' },
  { mode: 'VIREMENT', label: 'Virement', emoji: '🏦' },
  { mode: 'PAYPAL',   label: 'PayPal',   emoji: '🅿️' },
  { mode: 'SUMUP',    label: 'SumUp',    emoji: '📱' },
]

export const DEFAULT_PAYMENT_MODES: PaymentMode[] = ['CB', 'ESPECES', 'CHEQUE']

const KEY_MODES    = 'megesti_payment_modes'
const KEY_TERMINAL = 'megesti_sumup_terminal'

interface PaymentModesState {
  enabled: PaymentMode[]
  sumupTerminal: SumUpTerminal | null
  hydrate: () => Promise<void>
  toggle: (mode: PaymentMode) => Promise<void>
  setSumupTerminal: (t: SumUpTerminal | null) => Promise<void>
}

export const usePaymentModesStore = create<PaymentModesState>((set, get) => ({
  enabled: DEFAULT_PAYMENT_MODES,
  sumupTerminal: null,

  hydrate: async () => {
    try {
      const [modesJson, terminal] = await Promise.all([
        SecureStore.getItemAsync(KEY_MODES),
        SecureStore.getItemAsync(KEY_TERMINAL),
      ])
      const loaded: PaymentMode[] = modesJson ? JSON.parse(modesJson) : DEFAULT_PAYMENT_MODES
      // Garantir au moins un mode même si l'utilisateur a tout désactivé
      set({
        enabled: loaded.length > 0 ? loaded : DEFAULT_PAYMENT_MODES,
        sumupTerminal: (terminal as SumUpTerminal | null) ?? null,
      })
    } catch {}
  },

  toggle: async (mode) => {
    const current = get().enabled
    const next = current.includes(mode)
      ? current.filter(m => m !== mode)
      : [...current, mode]
    // Toujours garder au moins un mode
    const safe = next.length > 0 ? next : current
    set({ enabled: safe })
    await SecureStore.setItemAsync(KEY_MODES, JSON.stringify(safe))
  },

  setSumupTerminal: async (t) => {
    set({ sumupTerminal: t })
    if (t) await SecureStore.setItemAsync(KEY_TERMINAL, t)
    else await SecureStore.deleteItemAsync(KEY_TERMINAL)
  },
}))
