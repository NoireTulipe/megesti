import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api, setTokenGetter } from '@/lib/api'

const TOKEN_KEY = 'megesti_token'
const USER_KEY  = 'megesti_user'

// Enregistre le getter de token pour casser le cycle d'import
setTokenGetter(() => useAuthStore.getState().token)

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'EDITOR' | 'AUTHOR'
  tenantId: string
  tenantName: string
}

interface AuthState {
  token: string | null
  user:  AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const data = await api.post<{ token: string }>('/auth/login', { email, password })
    const token = data.token
    // Le payload JWT contient les infos user
    const payload = JSON.parse(atob(token.split('.')[1]))
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      tenantId: payload.tenantId,
      tenantName: payload.tenantName,
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    set({ token, user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    set({ token: null, user: null })
  },

  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ])
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson), isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))
