import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api, setTokenGetter } from '@/lib/api'
import { getDb } from '@/lib/db'

const TOKEN_KEY = 'megesti_token'
const USER_KEY  = 'megesti_user'

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

interface MeResponse {
  id: string; email: string
  firstName: string; lastName: string
  role: 'ADMIN' | 'EDITOR' | 'AUTHOR'
  tenantId: string; tenantName: string
}

interface AuthState {
  token: string | null
  user:  AuthUser | null
  isLoading: boolean
  login:       (email: string, password: string) => Promise<void>
  logout:      () => Promise<void>
  hydrate:     () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  // ── Login : on reçoit le token enrichi (firstName, lastName, tenantName inclus) ──
  login: async (email, password) => {
    const data = await api.post<{ token: string }>('/auth/login', { email, password })
    const token = data.token
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))

    const user: AuthUser = {
      id:         payload.sub ?? payload.userId,
      email:      payload.email     ?? '',
      firstName:  payload.firstName ?? '',
      lastName:   payload.lastName  ?? '',
      role:       payload.role,
      tenantId:   payload.tenantId,
      tenantName: payload.tenantName ?? '',
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    set({ token, user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    set({ token: null, user: null })
    // Vider les tables locales pour ne pas garder les données du compte précédent
    try {
      const db = await getDb()
      await db.execAsync('DELETE FROM ventes_locales')
      await db.execAsync('DELETE FROM frais_locaux')
      await db.execAsync('DELETE FROM sessions')
      await db.execAsync('DELETE FROM articles')
      await db.execAsync('DELETE FROM sync_queue')
    } catch {}
  },

  // ── Hydrate depuis le SecureStore ──
  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ])
      if (token && userJson) {
        const user: AuthUser = JSON.parse(userJson)
        set({ token, user, isLoading: false })

        // Rafraîchissement en arrière-plan si firstName absent (ancienne session pré-fix)
        if (!user.firstName) {
          get().refreshUser().catch(() => {})
        }
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  // ── Refresh depuis /auth/me (récupère firstName + tenantName à jour) ──
  refreshUser: async () => {
    const { token } = get()
    if (!token) return
    try {
      const me = await api.get<MeResponse>('/auth/me')
      const updatedUser: AuthUser = {
        id:         me.id,
        email:      me.email,
        firstName:  me.firstName,
        lastName:   me.lastName,
        role:       me.role,
        tenantId:   me.tenantId,
        tenantName: me.tenantName,
      }
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser))
      set({ user: updatedUser })
    } catch {
      // silencieux si hors-ligne
    }
  },
}))
