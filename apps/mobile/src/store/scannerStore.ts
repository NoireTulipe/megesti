import { create } from 'zustand'

export interface ScannedItem {
  articleId: string
  nom: string
  prixUnitaireHT: number
}

interface ScannerState {
  items: ScannedItem[]
  addItem: (item: ScannedItem) => void
  clearItems: () => void
}

export const useScannerStore = create<ScannerState>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  clearItems: () => set({ items: [] }),
}))
