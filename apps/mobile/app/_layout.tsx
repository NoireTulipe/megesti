import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { ActivityIndicator, View, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { DevMenu } from '@/components/DevMenu'
import { initDb } from '@/lib/db'
import { Colors, Fonts } from '@/constants/theme'
import '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate)
  const isLoading = useAuthStore(s => s.isLoading)
  const [dbReady, setDbReady] = useState(false)

  const hydrateDevUrl = useDevStore(s => s.hydrateApiUrl)

  useEffect(() => {
    initDb().then(() => setDbReady(true))
    hydrate()
    hydrateDevUrl()
  }, [])

  if (isLoading || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cream }}>
        <ActivityIndicator size="large" color={Colors.rose} />
        <Text style={{ marginTop: 16, fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft }}>
          Préparation de votre espace…
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DM Serif Display': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
  })

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <DevMenu />
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
