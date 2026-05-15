import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type PaymentMode = 'CB' | 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'SUMUP'
export type SumUpTerminal = 'air' | 'solo'

export const ALL_PAYMENT_MODES: { mode: PaymentMode; label: string; emoji: string }[] = [
  { mode: 'CB',       label: 'Carte bancaire', emoji: '💳' },
  { mode: 'ESPECES',  label: 'Espèces',        emoji: '💶' },
  { mode: 'CHEQUE',   label: 'Chèque',         emoji: '📝' },
  { mode: 'VIREMENT', label: 'Virement',       emoji: '🏦' },
  { mode: 'SUMUP',    label: 'SumUp',          emoji: '📱' },
]

const KEY_MODES    = 'megesti_payment_modes'
const KEY_TERMINAL = 'megesti_sumup_terminal'
const DEFAULT: PaymentMode[] = ['CB', 'ESPECES', 'CHEQUE']

interface PaymentModesState {
  enabled: PaymentMode[]
  sumupTerminal: SumUpTerminal | null
  hydrate: () => Promise<void>
  toggle: (mode: PaymentMode) => Promise<void>
  setSumupTerminal: (t: SumUpTerminal | null) => Promise<void>
}

export const usePaymentModesStore = create<PaymentModesState>((set, get) => ({
  enabled: DEFAULT,
  sumupTerminal: null,

  hydrate: async () => {
    try {
      const [modesJson, terminal] = await Promise.all([
        SecureStore.getItemAsync(KEY_MODES),
        SecureStore.getItemAsync(KEY_TERMINAL),
      ])
      set({
        enabled: modesJson ? JSON.parse(modesJson) : DEFAULT,
        sumupTerminal: (terminal as SumUpTerminal | null) ?? null,
      })
    } catch {}
  },

  toggle: async (mode) => {
    const current = get().enabled
    const next = current.includes(mode)
      ? current.filter(m => m !== mode)
      : [...current, mode]
    set({ enabled: next })
    await SecureStore.setItemAsync(KEY_MODES, JSON.stringify(next))
  },

  setSumupTerminal: async (t) => {
    set({ sumupTerminal: t })
    if (t) await SecureStore.setItemAsync(KEY_TERMINAL, t)
    else await SecureStore.deleteItemAsync(KEY_TERMINAL)
  },
}))
