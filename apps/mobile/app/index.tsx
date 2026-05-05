import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/authStore'

export default function Index() {
  const token = useAuthStore(s => s.token)
  const isLoading = useAuthStore(s => s.isLoading)

  if (isLoading) return null

  if (token) return <Redirect href="/(tabs)" />
  return <Redirect href="/login" />
}
