import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  nom:   string | null
  email: string | null
  login: (token: string, nom: string, email: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      nom:   null,
      email: null,
      login:  (token, nom, email) => {
        localStorage.setItem('admin_token', token)
        set({ token, nom, email })
      },
      logout: () => {
        localStorage.removeItem('admin_token')
        set({ token: null, nom: null, email: null })
      },
    }),
    { name: 'megesti-admin-auth' },
  ),
)
