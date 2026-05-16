import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSession } from '@/hooks/useLocalSession'
import { useLocalVentes } from '@/hooks/useLocalVentes'
import { api } from '@/lib/api'
import { getDb } from '@/lib/db'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'

type Tab = 'open' | 'history'

// ── Types ────────────────────────────────────────────────────────────────

interface RemoteSession {
  id: string; pointDeVenteId: string; pointDeVente: { nom: string } | null
  fondOuverture: number; fondFermeture: number | null
  dateOuverture: string; dateFermeture: string | null; statut: string
  _count: { ventes: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Écran ───────────────────────────────────────────────────────────────

export default function SessionsScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { session, refresh: refreshSession } = useLocalSession()
  const { ventes, refresh: refreshVentes } = useLocalVentes(session?.id)

  const [tab, setTab] = useState<Tab>('open')
  const [openSessions, setOpenSessions] = useState<RemoteSession[]>([])
  const [historySessions, setHistorySessions] = useState<RemoteSession[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Pull frais depuis le serveur au focus
  const fetchSessions = useCallback(async () => {
    try {
      const [open, closed] = await Promise.all([
        api.get<RemoteSession[]>('/sessions-caisse?statut=OUVERTE'),
        api.get<RemoteSession[]>('/sessions-caisse?statut=FERMEE'),
      ])
      setOpenSessions(open)
      setHistorySessions(closed)
    } catch {}
  }, [])

  useFocusEffect(useCallback(() => {
    fetchSessions()
    refreshSession()
    refreshVentes()
  }, [fetchSessions, refreshSession, refreshVentes]))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSessions()
    setRefreshing(false)
  }, [fetchSessions])

  // Basculer sur une autre session
  async function switchToSession(s: RemoteSession) {
    const db = await getDb()
    const oldSession = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM sessions WHERE statut = ? LIMIT 1', ['OUVERTE'],
    )
    await db.runAsync(`UPDATE sessions SET statut = 'FERMEE' WHERE statut = 'OUVERTE'`)
    await db.runAsync(
      `INSERT OR REPLACE INTO sessions (id, point_de_vente_id, point_de_vente_nom, date_ouverture, fond_ouverture, debiter_stock, statut, articles_exposes, synced)
       VALUES (?, ?, ?, datetime('now'), ?, 1, 'OUVERTE', '[]', 1)`,
      [s.id, s.pointDeVenteId, s.pointDeVente?.nom ?? 'Session', s.fondOuverture ?? 0],
    )
    if (oldSession && oldSession.id !== s.id) {
      await db.runAsync(`UPDATE ventes_locales SET session_id = ? WHERE session_id = ?`, [s.id, oldSession.id])
      await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [oldSession.id])
    }
    await refreshSession()
    router.push('/caisse')
  }

  // CA de la session active (depuis les ventes locales)
  const caSession = ventes.reduce((s, v) => s + v.total_ttc, 0)

  return (
    <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg, Dark.bg] : [Colors.sageLight, Colors.cream, Colors.cream]} style={styles.bg} />

      {/* Header */}
      <LinearGradient
        colors={isDark ? Gradients.sessionsDark : Gradients.sessions}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.heroGradient, { paddingTop: 48 + insets.top }]}>
        <Text style={styles.heroTitle}>Sessions</Text>

        <View style={styles.heroTabRow}>
          <TouchableOpacity style={[styles.heroTab, tab === 'open' && styles.heroTabActive]}
            onPress={() => setTab('open')} activeOpacity={0.7}>
            <Text style={[styles.heroTabText, tab === 'open' && styles.heroTabTextActive]}>
              Ouvertes {openSessions.length > 0 ? `(${openSessions.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroTab, tab === 'history' && styles.heroTabActive]}
            onPress={() => setTab('history')} activeOpacity={0.7}>
            <Text style={[styles.heroTabText, tab === 'history' && styles.heroTabTextActive]}>
              Historique {historySessions.length > 0 ? `(${historySessions.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.sage} />}>

        {/* ═══ OUVERTES ═══ */}
        {tab === 'open' && (
          openSessions.length === 0 ? (
            <View style={[styles.emptyCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>Aucune session ouverte</Text>
              <Text style={styles.emptySub}>Ouvrez une session de caisse pour commencer à vendre.</Text>
              <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85}
                onPress={() => router.push('/caisse')}>
                <LinearGradient colors={Gradients.caisse} style={styles.emptyBtnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.emptyBtnText}>Aller à la caisse</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Session active (celle en cours dans Caisse) — carte développée */}
              {session && (
                <LinearGradient colors={isDark ? Gradients.sessionsDark : Gradients.sessions} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.heroTop}>
                    <View style={styles.heroBadge}>
                      <View style={[styles.heroLiveDot, { backgroundColor: Colors.sage }]} />
                      <Text style={styles.heroLiveText}>Session active</Text>
                    </View>
                  </View>
                  <Text style={styles.heroPdv}>{session.point_de_vente_nom}</Text>
                  <Text style={styles.heroDate}>{fmtDate(session.date_ouverture)}</Text>
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{ventes.length}</Text>
                      <Text style={styles.heroStatLabel}>ventes</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{caSession.toFixed(0)} €</Text>
                      <Text style={styles.heroStatLabel}>CA</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{session.fond_ouverture.toFixed(0)} €</Text>
                      <Text style={styles.heroStatLabel}>fond</Text>
                    </View>
                  </View>
                  <View style={styles.heroBtnRow}>
                    <TouchableOpacity style={[styles.heroBtn, { flex: 1 }]} activeOpacity={0.85}
                      onPress={() => router.push('/caisse')}>
                      <Text style={styles.heroBtnText}>Aller à la caisse →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.heroBtn, styles.heroBtnDetail]} activeOpacity={0.85}
                      onPress={() => router.push(`/session-detail?id=${session!.id}`)}>
                      <Text style={styles.heroBtnText}>📋 Détail</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.heroBtn, { marginTop: 8 }]} activeOpacity={0.85}
                    onPress={() => router.push(`/session-detail?id=${session!.id}&openFrais=1`)}>
                    <Text style={styles.heroBtnText}>🧾 Frais de session</Text>
                  </TouchableOpacity>
                </LinearGradient>
              )}

              {/* Autres sessions ouvertes — cartes compactes */}
              {openSessions.filter(s => s.id !== session?.id).map(s => (
                <View key={s.id}
                  style={[styles.compactCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
                  <View style={[styles.compactAccent, { backgroundColor: Colors.sage }]} />
                  <View style={styles.compactBody}>
                    <View style={styles.compactTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.compactName, isDark && { color: Dark.text }]}>
                          {s.pointDeVente?.nom ?? 'Sans nom'}
                        </Text>
                      </View>
                      <Text style={[styles.compactCount, isDark && { color: '#8DB890' }]}>
                        {s._count?.ventes ?? 0} vente{(s._count?.ventes ?? 0) > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.compactDate, isDark && { color: Dark.textSoft }]}>
                      {fmtDate(s.dateOuverture)} · {fmtTime(s.dateOuverture)}
                    </Text>
                    <View style={styles.compactBtnRow}>
                      <TouchableOpacity style={styles.switchBtn} activeOpacity={0.7}
                        onPress={() => switchToSession(s)}>
                        <Text style={styles.switchBtnText}>Travailler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7}
                        onPress={() => router.push(`/session-detail?id=${s.id}`)}>
                        <Text style={styles.detailBtnText}>📋 Détail</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )
        )}

        {/* ═══ HISTORIQUE ═══ */}
        {tab === 'history' && (
          historySessions.length === 0 ? (
            <View style={[styles.emptyCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Aucune session passée</Text>
              <Text style={styles.emptySub}>L'historique apparaîtra ici une fois vos sessions fermées.</Text>
            </View>
          ) : (
            historySessions.map(s => (
              <TouchableOpacity key={s.id}
                style={[styles.compactCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}
                activeOpacity={0.8}
                onPress={() => router.push(`/session-detail?id=${s.id}`)}>
                <View style={[styles.compactAccent, { backgroundColor: Colors.textSoft }]} />
                <View style={styles.compactBody}>
                  <View style={styles.compactTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.compactName, isDark && { color: Dark.text }]}>
                        {s.pointDeVente?.nom ?? 'Sans nom'}
                      </Text>
                    </View>
                    <Text style={[styles.compactCount, isDark && { color: '#8DB890' }]}>
                      {s._count?.ventes ?? 0} vente{(s._count?.ventes ?? 0) > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.compactMeta}>
                    <Text style={[styles.compactDate, isDark && { color: Dark.textSoft }]}>
                      {fmtDate(s.dateOuverture)} · {fmtTime(s.dateOuverture)}
                    </Text>
                    {s.dateFermeture && (
                      <Text style={[styles.compactDate, isDark && { color: Dark.textSoft }]}>
                        {' → '}fermée {fmtDate(s.dateFermeture)}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.detailHint, isDark && { color: Dark.textSoft }]}>
                    Appuyer pour voir le détail →
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg:    { ...StyleSheet.absoluteFillObject },

  // Hero
  heroGradient: { paddingHorizontal: 20, paddingBottom: 24, marginBottom: 16 },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },

  // Tabs dans le hero
  heroTabRow: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: 4 },
  heroTab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  heroTabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  heroTabText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  heroTabTextActive: { color: Colors.white },

  content: { paddingHorizontal: 20 },

  // Session active (carte développée)
  heroCard: {
    borderRadius: Radius.xl, padding: 20, marginBottom: 14,
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  heroLiveDot: { width: 6, height: 6, borderRadius: 3 },
  heroLiveText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  heroPdv: { fontFamily: Fonts.displayItalic, fontSize: 20, fontStyle: 'italic', color: Colors.white, marginBottom: 4 },
  heroDate: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  heroStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: 14, marginBottom: 16,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '700', color: Colors.white },
  heroStatLabel: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroBtnRow: { flexDirection: 'row', gap: 8 },
  heroBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 14 },
  heroBtnDetail: { flex: 1 },
  heroBtnText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.white },

  // Cartes compactes (autres sessions ouvertes + historique)
  compactCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 8,
    overflow: 'hidden', shadowColor: Colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    alignItems: 'stretch',
  },
  compactAccent: { width: 5 },
  compactBody: { flex: 1, padding: 14 },
  compactTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  compactName: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  compactCount: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '800' },
  compactDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  compactMeta: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },

  compactBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  switchBtn: {
    backgroundColor: Colors.sage, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
  },
  switchBtnText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  detailBtn: {
    backgroundColor: Colors.inkFaint, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
  },
  detailBtnText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.ink },
  detailHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 6, fontStyle: 'italic' },

  // Empty
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 32, alignItems: 'center', shadowColor: Colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginTop: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  emptyBtn: { borderRadius: Radius.lg, overflow: 'hidden', width: '100%' },
  emptyBtnBg: { paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
})
