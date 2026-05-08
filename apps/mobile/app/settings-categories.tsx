import { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalArticles } from '@/hooks/useLocalArticles'
import { useCategoryColorsStore, CAT_PALETTE } from '@/store/categoryColorsStore'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Shadow } from '@/constants/theme'

// ── Écran ───────────────────────────────────────────────────────────────

export default function CategoryColorsScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { articles, pullFromServer } = useLocalArticles()
  const { colors, setColor } = useCategoryColorsStore()

  // Extraire les catégories uniques des articles
  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of articles) {
      if (a.categorie_id && a.categorie_nom) map.set(a.categorie_id, a.categorie_nom)
    }
    return Array.from(map.entries())
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom))
  }, [articles])

  // Pull au focus (géré par l'écran parent)
  useMemo(() => { pullFromServer() }, [])

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.inkFaint, Colors.cream]} style={s.bg} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.ink, Colors.inkLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.header, { paddingTop: insets.top + 48 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Couleurs des catégories</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {categories.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={[s.emptyEmoji, isDark && { color: Dark.textSoft }]}>🎨</Text>
            <Text style={[s.emptyText, isDark && { color: Dark.textMid }]}>Aucune catégorie</Text>
            <Text style={[s.emptySub, isDark && { color: Dark.textSoft }]}>
              Synchronisez vos articles pour voir les catégories.
            </Text>
          </View>
        ) : (
          categories.map(cat => {
            const selected = colors[cat.id]
            return (
              <View key={cat.id} style={[s.row, isDark && { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={[s.rowLabel, isDark && { color: Dark.text }]} numberOfLines={1}>
                  {cat.nom}
                </Text>

                {/* Pastilles de couleur */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.dotsRow}>
                  {CAT_PALETTE.map(color => {
                    const isSelected = selected === color
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[s.dot, { backgroundColor: color }, isSelected && s.dotSelected]}
                        activeOpacity={0.7}
                        onPress={() => setColor(cat.id, color)}
                      />
                    )
                  })}
                  {/* Bouton reset */}
                  {selected && (
                    <TouchableOpacity
                      style={[s.dot, s.dotReset]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Alert.alert('Réinitialiser', `Retirer la couleur de « ${cat.nom} » ?`, [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Retirer', onPress: () => setColor(cat.id, '') },
                        ])
                      }}>
                      <Text style={s.dotResetIcon}>✕</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg:    { ...StyleSheet.absoluteFillObject },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  headerTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.white, fontStyle: 'italic' },

  scroll: { paddingTop: 16, paddingHorizontal: 20 },

  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 14, marginBottom: 8,
    ...Shadow.card, borderWidth: 1, borderColor: 'transparent',
  },
  rowLabel: {
    fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text,
    width: 100, marginRight: 8, flexShrink: 0,
  },

  dotsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 3, borderColor: 'transparent',
  },
  dotSelected: {
    borderColor: Colors.ink,
    width: 32, height: 32, borderRadius: 16,
  },
  dotReset: {
    backgroundColor: 'transparent',
    borderWidth: 2, borderColor: Colors.textSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  dotResetIcon: {
    fontSize: 11, color: Colors.textSoft, fontWeight: '700',
  },
})
