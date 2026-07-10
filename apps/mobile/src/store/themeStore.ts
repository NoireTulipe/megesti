import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const KEY = 'megesti_dark_mode'
const KEY_SALE_ANIM = 'megesti_sale_animation'

interface ThemeState {
  isDark: boolean
  /** Animation (rebond + étincelles) sur la confirmation de vente. Sinon : fixe 2 s. */
  saleAnimation: boolean
  toggle: () => void
  toggleSaleAnimation: () => void
  hydrate: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  saleAnimation: true,

  toggle: () => {
    const next = !get().isDark
    set({ isDark: next })
    SecureStore.setItemAsync(KEY, next ? '1' : '0')
  },

  toggleSaleAnimation: () => {
    const next = !get().saleAnimation
    set({ saleAnimation: next })
    SecureStore.setItemAsync(KEY_SALE_ANIM, next ? '1' : '0')
  },

  hydrate: async () => {
    const [dark, anim] = await Promise.all([
      SecureStore.getItemAsync(KEY),
      SecureStore.getItemAsync(KEY_SALE_ANIM),
    ])
    if (dark === '1') set({ isDark: true })
    if (anim === '0') set({ saleAnimation: false })
  },
}))
