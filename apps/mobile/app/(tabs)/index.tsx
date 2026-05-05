import { useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { useLocalSession } from '@/hooks/useLocalSession'
import { useLocalVentes } from '@/hooks/useLocalVentes'
import { SyncBadge } from '@/components/SyncBadge'
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme'
import { useTranslation } from 'react-i18next'

const QUICK_ACTIONS = [
  { emoji: '💰', label: 'Vente rapide', color: Colors.ink, bg: Colors.inkFaint, route: '/caisse' },
  { emoji: '📷', label: 'Scanner ISBN', color: Colors.terra, bg: Colors.terraLight, route: '/caisse' },
  { emoji: '📦', label: 'Stock', color: Colors.sage, bg: Colors.sageLight, route: '/catalogue' },
  { emoji: '🧾', label: 'Frais', color: Colors.gold, bg: Colors.goldLight, route: '/ventes' },
]

export default function DashboardScreen() {
  const user = useAuthStore(s => s.user)
  const showDevMenu = useDevStore(s => s.showDevMenu)
  const { t } = useTranslation()
  const { session, loading: sessionLoading, refresh: refreshSession } = useLocalSession()
  const { ventes, stats, loading: ventesLoading, refresh: refreshVentes } = useLocalVentes()

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshSession(), refreshVentes()])
  }, [refreshSession, refreshVentes])

  // Dernières ventes du jour
  const today = new Date().toISOString().split('T')[0]
  const ventesJour = ventes
    .filter(v => v.date_vente.startsWith(today))
    .slice(0, 5)
  const caSession = ventes
    .filter(v => v.session_id === session?.id)
    .reduce((s, v) => s + v.total_ttc, 0)

  const hasSession = !!session
  const articleCount = session?.articles_exposes
    ? JSON.parse(session.articles_exposes).length
    : 0

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[Colors.roseLight, Colors.cream, Colors.cream]} style={styles.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={sessionLoading || ventesLoading} onRefresh={onRefresh} tintColor={Colors.rose} />
        }
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('dashboard.greeting')}{user?.firstName ? `, ${user.firstName}` : ''}
            </Text>
            <Text style={styles.tenant}>{user?.tenantName}</Text>
          </View>
          <TouchableOpacity style={styles.avatar}
            onLongPress={showDevMenu} delayLongPress={1500} activeOpacity={0.8}>
            <Text style={styles.avatarText}>
              {(user?.firstName ?? '')[0]}{(user?.lastName ?? '')[0]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Carte session active */}
        {hasSession ? (
          <LinearGradient
            colors={[Colors.ink, Colors.inkLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.sessionCard}
          >
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDot}>●</Text>
              <Text style={styles.sessionTitle}>{t('dashboard.activeSession')}</Text>
            </View>
            <Text style={styles.sessionPdv}>{session!.point_de_vente_nom}</Text>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{ventes.filter(v => v.session_id === session!.id).length}</Text>
                <Text style={styles.sessionStatLabel}>ventes</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{caSession.toFixed(0)} €</Text>
                <Text style={styles.sessionStatLabel}>CA session</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{articleCount}</Text>
                <Text style={styles.sessionStatLabel}>articles</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sessionBtn} activeOpacity={0.8}
              onPress={() => router.push('/caisse')}>
              <Text style={styles.sessionBtnText}>Voir la caisse →</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <TouchableOpacity style={styles.openSessionCard} activeOpacity={0.8}
            onPress={() => router.push('/caisse')}>
            <Text style={styles.openSessionEmoji}>📖</Text>
            <Text style={styles.openSessionTitle}>{t('dashboard.openSession')}</Text>
            <Text style={styles.openSessionSub}>Démarrez une nouvelle session de caisse pour enregistrer vos ventes.</Text>
          </TouchableOpacity>
        )}

        {/* Actions rapides */}
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={[styles.quickBtn, { backgroundColor: a.bg }]}
              activeOpacity={0.7} onPress={() => router.push(a.route as any)}>
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
              <Text style={[styles.quickLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dernières ventes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.todaySales')}</Text>
          <TouchableOpacity onPress={() => router.push('/ventes')}>
            <Text style={styles.sectionLink}>Tout voir →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.salesList}>
          {ventesJour.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Aucune vente aujourd'hui</Text>
            </View>
          ) : (
            ventesJour.map((v) => {
              const lignes = JSON.parse(v.lignes_json)
              const premierArticle = lignes[0]?.nom ?? 'Article'
              return (
                <View key={v.id} style={styles.saleRow}>
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleArticle}>{premierArticle}</Text>
                    <Text style={styles.saleMeta}>
                      ×{lignes.reduce((s: number, l: any) => s + l.quantite, 0)} · {v.mode_paiement} · {new Date(v.date_vente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.saleTotal}>{v.total_ttc.toFixed(2)} €</Text>
                </View>
              )
            })
          )}
        </View>

        {/* Statut synchro */}
        <SyncBadge />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  greeting: { fontFamily: Fonts.displayItalic, fontSize: 26, color: Colors.ink, fontStyle: 'italic' },
  tenant: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginTop: 2 },
  avatar: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.rose, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },

  sessionCard: { borderRadius: Radius.xl, padding: 22, marginBottom: 24, ...Shadow.float },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sessionDot: { color: Colors.sage, fontSize: 10 },
  sessionTitle: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
  sessionStats: { flexDirection: 'row', gap: 24, marginBottom: 18 },
  sessionStat: {},
  sessionStatValue: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '700', color: Colors.white },
  sessionStatLabel: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  sessionBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  sessionBtnText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.white },
  sessionPdv: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '600', color: Colors.white, marginTop: 4 },

  openSessionCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, marginBottom: 24, alignItems: 'center', ...Shadow.card },
  openSessionEmoji: { fontSize: 40, marginBottom: 12 },
  openSessionTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.ink, fontStyle: 'italic', marginBottom: 6 },
  openSessionSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.ink, fontStyle: 'italic', marginBottom: 12 },
  sectionLink: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.rose },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickBtn: { flex: 1, borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 6 },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  salesList: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.card, overflow: 'hidden' },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.cream },
  saleLeft: { flex: 1 },
  saleArticle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  saleMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  saleTotal: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.ink },
  emptyRow: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft },
})
