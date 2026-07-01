import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Config, INITIAL_API_URL } from '@/constants/Config'

const DEV_API_KEY = 'megesti_dev_api_url'

export type LogLevel = 'info' | 'warn' | 'error' | 'sync'

export interface DevLog {
  id: number
  ts: Date
  level: LogLevel
  message: string
}

interface DevState {
  apiUrl: string
  logs: DevLog[]
  useMock: boolean
  isDevMenuVisible: boolean

  setApiUrl: (url: string) => Promise<void>
  resetApiUrl: () => Promise<void>
  addLog: (level: LogLevel, message: string) => void
  clearLogs: () => void
  setUseMock: (v: boolean) => void
  showDevMenu: () => void
  hideDevMenu: () => void
  hydrateApiUrl: () => Promise<void>
}

let _logId = 0
const MAX_LOGS = 200

export const useDevStore = create<DevState>((set, get) => ({
  apiUrl: Config.apiBaseUrl,
  logs: [],
  useMock: false,
  isDevMenuVisible: false,

  setApiUrl: async (url: string) => {
    set({ apiUrl: url })
    await SecureStore.setItemAsync(DEV_API_KEY, url)
    // Mettre à jour Config aussi
    ;(Config as any).apiBaseUrl = url
    // uploadBaseUrl = racine du serveur (sans /api)
    const uploadBase = url.replace(/\/api\/?$/, '')
    ;(Config as any).uploadBaseUrl = uploadBase
    get().addLog('info', `API URL → ${url} (upload → ${uploadBase})`)
  },

  resetApiUrl: async () => {
    // Retour à la valeur par défaut (IP locale en dev, prod en release).
    await SecureStore.deleteItemAsync(DEV_API_KEY)
    set({ apiUrl: INITIAL_API_URL })
    ;(Config as any).apiBaseUrl = INITIAL_API_URL
    ;(Config as any).uploadBaseUrl = INITIAL_API_URL.replace(/\/api\/?$/, '')
    get().addLog('info', `API URL réinitialisée → ${INITIAL_API_URL}`)
  },

  addLog: (level: LogLevel, message: string) => {
    const log: DevLog = { id: ++_logId, ts: new Date(), level, message }
    set(state => ({
      logs: [log, ...state.logs].slice(0, MAX_LOGS),
    }))
  },

  clearLogs: () => set({ logs: [] }),
  setUseMock: (v: boolean) => set({ useMock: v }),
  showDevMenu: () => set({ isDevMenuVisible: true }),
  hideDevMenu: () => set({ isDevMenuVisible: false }),

  hydrateApiUrl: async () => {
    try {
      const saved = await SecureStore.getItemAsync(DEV_API_KEY)
      if (saved) {
        set({ apiUrl: saved })
        ;(Config as any).apiBaseUrl = saved
      }
    } catch {}
  },
}))
