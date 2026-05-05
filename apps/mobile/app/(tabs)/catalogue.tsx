import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalArticles } from '@/hooks/useLocalArticles'
import { useLocalSession } from '@/hooks/useLocalSession'
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme'

export default function CatalogueScreen() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const { articles, loading, refresh, pullFromServer } = useLocalArticles()
  const { session } = useLocalSession()

  const exposedIds: string[] = session?.articles_exposes ? JSON.parse(session.articles_exposes) : []

  const displayed = articles.filter(a =>
    (exposedIds.length === 0 || exposedIds.includes(a.id)) &&
    (a.nom.toLowerCase().includes(search.toLowerCase()) ||
     (a.isbn ?? '').includes(search)))

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[Colors.sageLight, Colors.cream]} style={styles.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Articles exposés</Text>
        <Text style={styles.subtitle}>{displayed.length} articles</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Rechercher par titre ou ISBN…" placeholderTextColor={Colors.textSoft} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.sage} />
        }
      >
        {displayed.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>Aucun article exposé</Text>
            <Text style={styles.emptySub}>Ouvrez une session de caisse et sélectionnez vos articles.</Text>
          </View>
        ) : (
          displayed.map(a => (
            <TouchableOpacity key={a.id} style={styles.card} activeOpacity={0.7}
              onPress={() => setSelected(selected === a.id ? null : a.id)}>
              <View style={styles.cardImg}>
                <Text style={styles.cardImgEmoji}>📚</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{a.nom}</Text>
                <Text style={styles.cardAuthor}>{a.rayon_nom ?? 'Sans rayon'}</Text>
                {selected === a.id && (
                  <View style={styles.cardDetail}>
                    {a.isbn && <Text style={styles.detailRow}>ISBN : {a.isbn}</Text>}
                    <Text style={styles.detailRow}>Stock : {a.stock_local} exemplaires</Text>
                    <Text style={styles.detailRow}>Prix : {a.prix_vente_ht.toFixed(2)} €</Text>
                    <Text style={styles.detailRow}>TVA : {a.taux_tva}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardPrice}>{a.prix_vente_ht.toFixed(2)} €</Text>
                <View style={[styles.stockBadge, a.stock_local <= 3 && styles.stockBadgeLow]}>
                  <Text style={[styles.stockBadgeText, a.stock_local <= 3 && styles.stockBadgeTextLow]}>
                    {a.stock_local}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, fontStyle: 'italic' },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginTop: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(36,51,71,0.06)' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text, paddingVertical: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontFamily: Fonts.display, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    marginBottom: 8, ...Shadow.card, alignItems: 'center',
  },
  cardImg: { width: 52, height: 70, backgroundColor: Colors.cream, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardImgEmoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  cardAuthor: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginTop: 2 },
  cardDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.cream },
  detailRow: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMid, marginBottom: 3 },
  cardRight: { alignItems: 'flex-end', marginLeft: 12 },
  cardPrice: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.ink },
  stockBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.sageLight },
  stockBadgeLow: { backgroundColor: Colors.terraLight },
  stockBadgeText: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', color: Colors.sage },
  stockBadgeTextLow: { color: Colors.terra },
})
