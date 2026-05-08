import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const KEY = 'megesti_dark_mode'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  hydrate: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  toggle: () => {
    const next = !get().isDark
    set({ isDark: next })
    SecureStore.setItemAsync(KEY, next ? '1' : '0')
  },

  hydrate: async () => {
    const val = await SecureStore.getItemAsync(KEY)
    if (val === '1') set({ isDark: true })
  },
}))
