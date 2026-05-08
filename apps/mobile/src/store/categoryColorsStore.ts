import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const KEY = 'megesti_cat_colors'

// Palette de 12 couleurs prédéfinies
export const CAT_PALETTE = [
  '#6C5CE7', // violet
  '#E74C3C', // rouge
  '#E67E22', // orange
  '#F1C40F', // jaune
  '#2ECC71', // vert
  '#1ABC9C', // turquoise
  '#3498DB', // bleu
  '#9B59B6', // mauve
  '#E91E63', // rose
  '#FF6F00', // ambre
  '#00BCD4', // cyan
  '#8BC34A', // lime
]

interface CatColorState {
  colors: Record<string, string>  // categorieId → couleur hex
  setColor: (catId: string, color: string) => void
  getColor: (catId: string) => string | undefined
  hydrate: () => Promise<void>
}

export const useCategoryColorsStore = create<CatColorState>((set, get) => ({
  colors: {},

  setColor: (catId, color) => {
    set(s => {
      const next = { ...s.colors, [catId]: color }
      SecureStore.setItemAsync(KEY, JSON.stringify(next))
      return { colors: next }
    })
  },

  getColor: (catId) => get().colors[catId],

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY)
      if (raw) set({ colors: JSON.parse(raw) })
    } catch {}
  },
}))
