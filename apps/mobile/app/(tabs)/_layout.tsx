import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Dark, Fonts, Radius } from '@/constants/theme'
import { useThemeStore } from '@/store/themeStore'

function TabIcon({ emoji, focused, isDark }: { emoji: string; focused: boolean; isDark: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && (isDark ? tabStyles.iconWrapActiveDark : tabStyles.iconWrapActive)]}>
      <Text style={tabStyles.icon}>{emoji}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const isDark = useThemeStore(s => s.isDark)
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: [tabStyles.bar, {
        paddingBottom: 8 + insets.bottom, height: 68 + insets.bottom,
        backgroundColor: isDark ? '#0D1525' : Colors.white,
        shadowColor: isDark ? 'transparent' : Colors.text,
        shadowOpacity: isDark ? 0 : 0.05,
        borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderTopWidth: isDark ? 1 : 0,
      }],
      tabBarShowLabel: true,
      tabBarActiveTintColor: isDark ? Dark.accent : Colors.rose,
      tabBarInactiveTintColor: isDark ? Dark.textSoft : Colors.textSoft,
      tabBarLabelStyle: tabStyles.label,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Accueil',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🌸" focused={focused} isDark={isDark} />,
      }} />
      <Tabs.Screen name="caisse" options={{
        title: 'Caisse',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} isDark={isDark} />,
      }} />
      <Tabs.Screen name="catalogue" options={{
        title: 'Stock',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} isDark={isDark} />,
      }} />
      <Tabs.Screen name="sessions" options={{
        title: 'Sessions',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" focused={focused} isDark={isDark} />,
      }} />
      <Tabs.Screen name="bilan" options={{
        title: 'Bilan',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} isDark={isDark} />,
      }} />
      {/* ventes.tsx conservé pour compatibilité liens, masqué de la tab bar */}
      <Tabs.Screen name="ventes" options={{ href: null }} />
    </Tabs>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    borderTopWidth: 0,
    paddingTop: 8,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 16,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: -4,
  },
  iconWrapActive: { backgroundColor: Colors.roseLight },
  iconWrapActiveDark: { backgroundColor: Dark.roseLight },
  icon: { fontSize: 20 },
})
