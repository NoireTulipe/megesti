import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Fonts, Radius } from '@/constants/theme'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={tabStyles.icon}>{emoji}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: [tabStyles.bar, { paddingBottom: 8 + insets.bottom, height: 68 + insets.bottom }],
      tabBarShowLabel: true,
      tabBarActiveTintColor: Colors.ink,
      tabBarInactiveTintColor: Colors.textSoft,
      tabBarLabelStyle: tabStyles.label,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Accueil',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🌸" focused={focused} />,
      }} />
      <Tabs.Screen name="caisse" options={{
        title: 'Caisse',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} />,
      }} />
      <Tabs.Screen name="catalogue" options={{
        title: 'Articles',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
      }} />
      <Tabs.Screen name="ventes" options={{
        title: 'Ventes',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
      }} />
    </Tabs>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    paddingTop: 8,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -4,
  },
  iconWrapActive: {
    backgroundColor: Colors.roseLight,
  },
  icon: {
    fontSize: 20,
  },
})
