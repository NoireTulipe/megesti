import { create } from 'zustand'
import { api, setToken, clearToken } from '@/lib/api'

export interface AuthUser {
  id:         string
  email:      string
  firstName:  string
  lastName:   string
  role:       string
  tenantId:   string
  tenantName: string
}

interface AuthState {
  user:    AuthUser | null
  ready:   boolean
  login:   (email: string, password: string, slug?: string) => Promise<void>
  logout:  () => void
  restore: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:  null,
  ready: false,

  login: async (email, password, slug?) => {
    const { token } = await api.post<{ token: string }>('/auth/login', { email, password, ...(slug ? { slug } : {}) })
    setToken(token)
    const user = await api.get<AuthUser>('/auth/me')
    set({ user })
  },

  logout: () => {
    clearToken()
    set({ user: null })
  },

  // Appelé au démarrage : rehydrate depuis le token en localStorage
  restore: async () => {
    try {
      const user = await api.get<AuthUser>('/auth/me')
      set({ user, ready: true })
    } catch {
      clearToken()
      set({ user: null, ready: true })
    }
  },
}))
