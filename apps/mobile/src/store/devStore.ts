import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Config } from '@/constants/Config'

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
    get().addLog('info', `API URL → ${url}`)
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
