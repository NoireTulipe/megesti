import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { ActivityIndicator, View, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { useThemeStore } from '@/store/themeStore'
import { useCategoryColorsStore } from '@/store/categoryColorsStore'
import { usePaymentModesStore } from '@/store/paymentModesStore'
import { SumUp } from '@megesti/react-native-sumup'
import { Config } from '@/constants/Config'
import { DevMenu } from '@/components/DevMenu'
import { initDb } from '@/lib/db'
import { Colors, Dark, Fonts } from '@/constants/theme'
import '@/i18n'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate)
  const isLoading = useAuthStore(s => s.isLoading)
  const [dbReady, setDbReady] = useState(false)

  const hydrateDevUrl      = useDevStore(s => s.hydrateApiUrl)
  const hydrateTheme       = useThemeStore(s => s.hydrate)
  const hydrateCatColors   = useCategoryColorsStore(s => s.hydrate)
  const hydratePaymentModes = usePaymentModesStore(s => s.hydrate)
  const isDark = useThemeStore(s => s.isDark)

  useEffect(() => {
    initDb().then(() => setDbReady(true))
    hydrate()
    hydrateDevUrl()
    hydrateTheme()
    hydrateCatColors()
    hydratePaymentModes().then(async () => {
      const modes = usePaymentModesStore.getState().enabled
      if (!modes.includes('SUMUP') || !SumUp.isAvailable()) return
      // Init au démarrage pour que isReady() reflète l'état réel. Le SDK 4.x
      // n'expose pas de token (getAccessToken renvoie null), donc pas de login
      // transparent possible ici : la reconnexion se fait à l'encaissement
      // (caisse) ou dans les réglages, via l'écran SumUp.
      try { await SumUp.init(Config.sumupAffiliateKey) } catch {}
    })
  }, [])

  if (isLoading || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? Dark.bg : Colors.cream }}>
        <ActivityIndicator size="large" color={isDark ? Dark.accent : Colors.rose} />
        <Text style={{ marginTop: 16, fontFamily: Fonts.body, fontSize: 13, color: isDark ? Dark.textSoft : Colors.textSoft }}>
          Préparation de votre espace…
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'DM Serif Display': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
    'DM Serif Display Italic': require('../assets/fonts/DMSerifDisplay-Italic.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

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
