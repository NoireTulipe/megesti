import { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalArticles, LocalArticle } from '@/hooks/useLocalArticles'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Gradients } from '@/constants/theme'

type Niveau = 'alerte' | 'attention'

export default function StockAlertesScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const params = useLocalSearchParams<{ niveau: Niveau }>()
  const niveau: Niveau = params.niveau === 'attention' ? 'attention' : 'alerte'
  const { articles } = useLocalArticles()

  const filtres = useMemo(() => {
    const enAlerte = articles.filter(a => a.stock_local <= 0 || (a.stock_alerte > 0 && a.stock_local <= a.stock_alerte))
    const enAttention = articles.filter(a => {
      if (a.stock_local <= 0 || (a.stock_alerte > 0 && a.stock_local <= a.stock_alerte)) return false
      return a.stock_tension > 0 && a.stock_local <= a.stock_tension
    })
    return niveau === 'alerte' ? enAlerte : enAttention
  }, [articles, niveau])

  const isAlerte = niveau === 'alerte'

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient
        colors={isAlerte
          ? (isDark ? ['#3a1f1d', Dark.bg, Dark.bg] : ['#F0D9D5', Colors.cream, Colors.cream])
          : (isDark ? ['#3a3115', Dark.bg, Dark.bg] : ['#F0E3C5', Colors.cream, Colors.cream])}
        style={s.bg}
      />

      {/* Header */}
      <LinearGradient
        colors={isAlerte ? [Colors.terra, Colors.roseDark] : [Colors.gold, '#B88A0E']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.hero, { paddingTop: 48 + insets.top }]}>
        <View style={s.heroTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={s.heroTitle}>{isAlerte ? '🚨 Alertes stock' : '⚠️ Attentions stock'}</Text>
          <View style={{ width: 70 }} />
        </View>
        <Text style={s.heroSub}>
          {filtres.length} article{filtres.length > 1 ? 's' : ''} {isAlerte ? 'en alerte' : 'à surveiller'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>

        {filtres.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{isAlerte ? '✅' : '📦'}</Text>
            <Text style={[s.emptyText, isDark && { color: Dark.textMid }]}>
              {isAlerte ? 'Aucune alerte stock' : 'Aucune attention stock'}
            </Text>
            <Text style={[s.emptySub, isDark && { color: Dark.textSoft }]}>
              {isAlerte ? 'Tous vos stocks sont au-dessus des seuils critiques.' : 'Tous vos stocks sont confortables.'}
            </Text>
          </View>
        ) : (
          filtres.map(a => <AlerteCard key={a.id} a={a} isAlerte={isAlerte} isDark={isDark} />)
        )}
      </ScrollView>
    </View>
  )
}

function AlerteCard({ a, isAlerte, isDark }: { a: LocalArticle; isAlerte: boolean; isDark: boolean }) {
  const rupture = a.stock_local <= 0
  return (
    <TouchableOpacity
      style={[s.card, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/stock-mouvement?articleId=${a.id}`)}>

      {a.thumb_app_url ? (
        <Image source={a.thumb_app_url} style={s.cardImg} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[s.cardImg, s.cardImgEmpty]}>
          <Text style={s.cardImgEmoji}>📚</Text>
        </View>
      )}

      <View style={s.cardBody}>
        <Text style={[s.cardTitle, isDark && { color: Dark.text }]} numberOfLines={2}>{a.nom}</Text>
        <Text style={[s.cardMeta, isDark && { color: Dark.textSoft }]}>
          {a.rayon_nom ?? 'Sans rayon'}{a.categorie_nom ? ` · ${a.categorie_nom}` : ''}
        </Text>
        <Text style={s.cardMeta2}>
          {isAlerte
            ? `Seuil critique : ${a.stock_alerte}`
            : `Seuil d'attention : ${a.stock_tension}`}
        </Text>
      </View>

      <View style={[s.stockCol, isAlerte && (rupture ? s.stockColRupture : s.stockColAlerte), !isAlerte && s.stockColWarn]}>
        <Text style={s.stockNum}>{a.stock_local}</Text>
        <Text style={s.stockLbl}>{rupture ? 'rupture' : 'en stock'}</Text>
        <Text style={s.stockEdit}>✎ Modifier</Text>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },

  hero: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { paddingVertical: 6 },
  backTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.white, fontWeight: '600' },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.white, fontStyle: 'italic' },
  heroSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  list: { padding: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, marginBottom: 10, alignItems: 'center', shadowColor: Colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardImg: { width: 48, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.cream },
  cardImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardImgEmoji: { fontSize: 22 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  cardMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft },
  cardMeta2: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2, fontStyle: 'italic' },

  stockCol: { alignItems: 'center', minWidth: 70, paddingHorizontal: 8, paddingVertical: 8, borderRadius: Radius.md },
  stockColAlerte: { backgroundColor: 'rgba(196,84,74,0.12)' },
  stockColRupture: { backgroundColor: 'rgba(196,84,74,0.2)' },
  stockColWarn: { backgroundColor: 'rgba(212,160,23,0.12)' },
  stockNum: { fontFamily: Fonts.displayItalic, fontSize: 24, fontStyle: 'italic', color: Colors.text },
  stockLbl: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  stockEdit: { fontFamily: Fonts.body, fontSize: 10, color: Colors.terra, marginTop: 4, fontWeight: '600' },
})
