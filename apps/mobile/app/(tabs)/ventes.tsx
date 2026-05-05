import { useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalVentes, LocalVente } from '@/hooks/useLocalVentes'
import { useLocalSession } from '@/hooks/useLocalSession'
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme'

const MODE_EMOJI: Record<string, string> = { CB: '💳', ESPECES: '💶', CHEQUE: '📝', SUMUP: '📱', VIREMENT: '🏦', PDV: '🏪' }

function groupByDate(ventes: LocalVente[]) {
  const groups: Record<string, LocalVente[]> = {}
  for (const v of ventes) {
    const day = new Date(v.date_vente).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[day]) groups[day] = []
    groups[day].push(v)
  }
  return Object.entries(groups)
}

export default function VentesScreen() {
  const { session } = useLocalSession()
  const { ventes, stats, loading, refresh } = useLocalVentes(session?.id)

  const onRefresh = useCallback(() => { refresh() }, [refresh])
  const grouped = groupByDate(ventes)

  const today = new Date().toISOString().split('T')[0]
  const totalJour = ventes
    .filter(v => v.date_vente.startsWith(today))
    .reduce((s, v) => s + v.total_ttc, 0)

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[Colors.inkFaint, Colors.cream]} style={styles.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Ventes</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{totalJour.toFixed(0)} €</Text>
            <Text style={styles.headerStatLabel}>aujourd'hui</Text>
          </View>
          {stats.enAttente > 0 && (
            <View style={styles.syncWarn}>
              <Text style={styles.syncWarnText}>{stats.enAttente} en attente</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.ink} />
        }
      >
        {ventes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Aucune vente enregistrée</Text>
            <Text style={styles.emptySub}>Les ventes apparaîtront ici une fois la session démarrée.</Text>
          </View>
        ) : (
          grouped.map(([day, dayVentes]) => (
            <View key={day}>
              <Text style={styles.dayLabel}>{day}</Text>
              {dayVentes.map(v => {
                const lignes = JSON.parse(v.lignes_json)
                const premierArticle = lignes[0]?.nom ?? 'Article'
                const qteTotal = lignes.reduce((s: number, l: any) => s + l.quantite, 0)
                return (
                  <View key={v.id} style={styles.saleCard}>
                    <View style={styles.saleLeft}>
                      <Text style={styles.saleEmoji}>{MODE_EMOJI[v.mode_paiement] ?? '💰'}</Text>
                      <View>
                        <Text style={styles.saleArticle}>{premierArticle}</Text>
                        <Text style={styles.saleMeta}>×{qteTotal} · {v.mode_paiement}</Text>
                      </View>
                    </View>
                    <View style={styles.saleRight}>
                      <Text style={styles.saleTotal}>{v.total_ttc.toFixed(2)} €</Text>
                      <View style={[styles.syncDot, v.synced ? styles.syncDotOk : styles.syncDotPending]}>
                        <Text style={v.synced ? styles.syncDotTextOk : styles.syncDotTextPending}>
                          {v.synced ? '✓' : '↑'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, fontStyle: 'italic' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  headerStat: {},
  headerStatValue: { fontFamily: Fonts.body, fontSize: 18, fontWeight: '700', color: Colors.ink },
  headerStatLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  syncWarn: { backgroundColor: Colors.goldLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  syncWarnText: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', color: Colors.gold },
  list: { paddingHorizontal: 20, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontFamily: Fonts.display, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6 },
  dayLabel: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  saleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 6, ...Shadow.card },
  saleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saleEmoji: { fontSize: 22 },
  saleArticle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  saleMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  saleRight: { alignItems: 'flex-end', gap: 4 },
  saleTotal: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.ink },
  syncDot: { width: 22, height: 22, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center' },
  syncDotOk: { backgroundColor: Colors.sageLight },
  syncDotPending: { backgroundColor: Colors.goldLight },
  syncDotTextOk: { fontSize: 11, fontWeight: '700', color: Colors.sage },
  syncDotTextPending: { fontSize: 11, fontWeight: '700', color: Colors.gold },
})
