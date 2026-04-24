import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { user, ready, restore } = useAuthStore()

  useEffect(() => {
    if (!ready) restore()
  }, [ready, restore])

  if (!ready) return null // splash court le temps de vérifier le token

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
