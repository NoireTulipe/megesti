import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { SumUp } from '@megesti/react-native-sumup'
import { usePaymentModesStore, ALL_PAYMENT_MODES } from '@/store/paymentModesStore'
import { Colors, Dark, Fonts, Radius, Shadow } from '@/constants/theme'
import { Config } from '@/constants/Config'

type Tab = 'compte' | 'apparence' | 'paiement'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'compte',   label: 'Compte',    emoji: '👤' },
  { key: 'apparence',label: 'Apparence', emoji: '🎨' },
  { key: 'paiement', label: 'Paiement',  emoji: '💳' },
]

// ── Composants ──────────────────────────────────────────────────────────

function SettingRow({ label, sub, right, onPress, last, isDark }: {
  label: string; sub?: string; right?: React.ReactNode
  onPress?: () => void; last?: boolean; isDark?: boolean
}) {
  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowBorder, isDark && s.rowDark]}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
      onPress={onPress}>
      <View style={s.rowLeft}>
        <Text style={[s.rowLabel, isDark && s.rowLabelDark]}>{label}</Text>
        {sub ? <Text style={[s.rowSub, isDark && s.rowSubDark]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={s.rowArrow}>›</Text> : null)}
    </TouchableOpacity>
  )
}

// ── Écran ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const isDark = useThemeStore(s => s.isDark)
  const toggleTheme = useThemeStore(s => s.toggle)

  const [tab, setTab] = useState<Tab>('compte')

  useEffect(() => {
    if (tab === 'paiement') refreshSumupLoginState()
  }, [tab])
  const enabledModes    = usePaymentModesStore(s => s.enabled)
  const toggleMode      = usePaymentModesStore(s => s.toggle)
  const sumupTerminal   = usePaymentModesStore(s => s.sumupTerminal)
  const setTerminal     = usePaymentModesStore(s => s.setSumupTerminal)
  const [testingSumup, setTestingSumup] = useState(false)
  const [sumupLoggedIn, setSumupLoggedIn] = useState(false)
  const [checkingLogin, setCheckingLogin] = useState(false)

  function cycleSumupTerminal() {
    setTerminal(sumupTerminal === 'air' ? 'solo' : sumupTerminal === 'solo' ? null : 'air')
  }

  async function refreshSumupLoginState() {
    if (!SumUp.isAvailable()) return
    const ready = await SumUp.isReady()
    setSumupLoggedIn(ready)
  }

  async function handleSumupLogin() {
    setCheckingLogin(true)
    try {
      await SumUp.init(Config.sumupAffiliateKey)
      const success = await SumUp.login()
      setSumupLoggedIn(success)
      if (!success) Alert.alert('Connexion annulée', 'La connexion à SumUp a été annulée.')
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de se connecter à SumUp.')
    } finally {
      setCheckingLogin(false)
    }
  }

  async function handleSumupLogout() {
    await SumUp.logout()
    setSumupLoggedIn(false)
  }

  async function testSumupConnection() {
    if (!sumupTerminal) {
      Alert.alert('Terminal requis', 'Veuillez d\'abord sélectionner un type de terminal SumUp.')
      return
    }
    setTestingSumup(true)
    if (!SumUp.isAvailable()) {
      setTestingSumup(false)
      Alert.alert(
        'Module natif absent',
        sumupTerminal === 'air'
          ? 'Le module SumUp n\'est disponible qu\'avec une build native (expo run:android / expo run:ios).\n\nExpo Go ne supporte pas les SDK Bluetooth.'
          : 'Le module SumUp n\'est disponible qu\'avec une build native. Le terminal Solo utilisera l\'API REST côté serveur.'
      )
      return
    }
    const ready = await SumUp.isReady()
    setTestingSumup(false)
    Alert.alert(
      ready ? 'SumUp connecté' : 'SumUp non prêt',
      ready
        ? 'Le terminal est connecté et prêt à encaisser.'
        : 'Vérifiez que le terminal est allumé et couplé en Bluetooth.'
    )
  }

  function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <View style={[s.shell, isDark && s.shellDark]}>
      <LinearGradient
        colors={isDark ? ['#1E1A2E', '#101D33'] : [Colors.inkFaint, Colors.cream]}
        style={s.bg}
      />

      {/* Header */}
      <LinearGradient
        colors={[Colors.ink, Colors.inkLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.header, { paddingTop: insets.top + 48 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Réglages</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Onglets */}
      <View style={[s.tabRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.white, shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && (isDark ? s.tabActiveDark : s.tabActive)]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}>
            <Text style={s.tabEmoji}>{t.emoji}</Text>
            <Text style={[s.tabLabel, { color: tab === t.key ? (isDark ? Dark.accent : Colors.ink) : (isDark ? Dark.textSoft : Colors.textSoft) }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* ═══ COMPTE ═══ */}
        {tab === 'compte' && (
          <>
            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>Profil</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                <SettingRow label={user?.firstName ? `${user.firstName} ${user.lastName}` : '—'} sub="Nom" isDark={isDark} />
                <SettingRow label={user?.email ?? '—'} sub="Email" isDark={isDark} />
                <SettingRow label={user?.role === 'ADMIN' ? 'Administrateur' : 'Éditeur'} sub="Rôle" last isDark={isDark} />
              </View>
            </View>

            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>Maison d'édition</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                <SettingRow label={user?.tenantName ?? '—'} sub="Nom de la structure" last isDark={isDark} />
              </View>
            </View>

            <TouchableOpacity
              style={[s.logoutBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.white, borderColor: isDark ? 'rgba(200,93,58,0.3)' : Colors.terraLight }]}
              onPress={handleLogout} activeOpacity={0.7}>
              <Text style={[s.logoutText, isDark && s.logoutTextDark]}>Se déconnecter</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══ APPARENCE ═══ */}
        {tab === 'apparence' && (
          <>
            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>Thème</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                <SettingRow
                  label="Mode sombre"
                  sub="Reprend le skin de la page de connexion"
                  right={<Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: Colors.creamDark, true: Colors.inkFaint }}
                    thumbColor={isDark ? Colors.ink : Colors.textSoft}
                  />}
                  last
                  isDark={isDark}
                />
              </View>
            </View>

            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>Couleurs des catégories</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                <SettingRow
                  label="Personnaliser"
                  sub="Associez une couleur à chaque catégorie de produit"
                  onPress={() => router.push('/settings-categories')}
                  last
                  isDark={isDark}
                />
              </View>
            </View>
          </>
        )}

        {/* ═══ PAIEMENT ═══ */}
        {tab === 'paiement' && (
          <>
            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>Modes disponibles à l'encaissement</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                {ALL_PAYMENT_MODES.filter(m => m.mode !== 'SUMUP').map((m, idx, arr) => (
                  <SettingRow
                    key={m.mode}
                    label={`${m.emoji}  ${m.label}`}
                    last={idx === arr.length - 1}
                    isDark={isDark}
                    right={
                      <Switch
                        value={enabledModes.includes(m.mode)}
                        onValueChange={() => toggleMode(m.mode)}
                        trackColor={{ false: Colors.creamDark, true: Colors.inkFaint }}
                        thumbColor={enabledModes.includes(m.mode) ? Colors.ink : Colors.textSoft}
                      />
                    }
                  />
                ))}
              </View>
            </View>

            <View style={s.section}>
              <Text style={[s.sectionTitle, isDark && s.sectionTitleDark]}>SumUp</Text>
              <View style={[s.sectionBody, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.white, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent', shadowColor: isDark ? 'transparent' : Colors.text, elevation: isDark ? 0 : 3 }]}>
                <SettingRow
                  label="📱  Activer SumUp"
                  sub="Affiche SumUp comme mode de paiement"
                  last={!enabledModes.includes('SUMUP')}
                  isDark={isDark}
                  right={
                    <Switch
                      value={enabledModes.includes('SUMUP')}
                      onValueChange={() => toggleMode('SUMUP')}
                      trackColor={{ false: Colors.creamDark, true: Colors.inkFaint }}
                      thumbColor={enabledModes.includes('SUMUP') ? Colors.ink : Colors.textSoft}
                    />
                  }
                />
                {enabledModes.includes('SUMUP') && (
                  <>
                    <SettingRow
                      label="Terminal"
                      sub={sumupTerminal === 'air' ? 'Air (Bluetooth)' : sumupTerminal === 'solo' ? 'Solo (4G autonome)' : 'Non sélectionné — appuyer pour choisir'}
                      onPress={cycleSumupTerminal}
                      isDark={isDark}
                    />
                    {SumUp.isAvailable() ? (
                      sumupLoggedIn ? (
                        <SettingRow
                          label="✅  Connecté à SumUp"
                          sub="Appuyer pour se déconnecter"
                          onPress={handleSumupLogout}
                          isDark={isDark}
                        />
                      ) : (
                        <SettingRow
                          label={checkingLogin ? 'Connexion en cours…' : '🔗  Se connecter à SumUp'}
                          sub="Ouvre l'écran de connexion SumUp"
                          onPress={checkingLogin ? undefined : handleSumupLogin}
                          isDark={isDark}
                        />
                      )
                    ) : (
                      <SettingRow
                        label="Module natif absent"
                        sub="SumUp nécessite une build release"
                        isDark={isDark}
                      />
                    )}
                    <SettingRow
                      label="Tester le terminal"
                      sub="Vérifier que le terminal répond"
                      onPress={testSumupConnection}
                      last
                      isDark={isDark}
                    />
                  </>
                )}
              </View>
            </View>
            {tab === 'paiement' && (
              <View style={[s.trustBox, isDark && s.trustBoxDark]}>
                <Text style={[s.trustIcon]}>🔒</Text>
                <Text style={[s.trustText, isDark && s.trustTextDark]}>
                  <Text style={s.trustBold}>Vos identifiants SumUp ne transitent jamais par MeGesti.</Text>
                  {' '}La connexion s'établit directement entre votre appareil et les serveurs SumUp. MeGesti ne stocke ni ne voit vos credentials.
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={[s.version, isDark && s.versionDark]}>MeGesti v0.0.1</Text>
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  shellDark: { backgroundColor: Dark.bg },
  bg: { ...StyleSheet.absoluteFillObject },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  headerTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.white, fontStyle: 'italic' },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 8,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 4, ...Shadow.card,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: Radius.md,
  },
  tabActive: { backgroundColor: Colors.inkFaint },
  tabActiveDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  tabEmoji: { fontSize: 15 },
  tabLabel: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600' },
  tabLabelActive: {},

  scroll: { paddingTop: 12, paddingHorizontal: 20 },

  // Sections
  section: { marginBottom: 18 },
  sectionTitle: {
    fontFamily: Fonts.body, fontSize: 10, fontWeight: '700',
    color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 6, marginLeft: 4,
  },
  sectionTitleDark: { color: Dark.textSoft },
  sectionBody: {
    borderRadius: Radius.lg, ...Shadow.card, overflow: 'hidden',
  },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 48,
  },
  rowDark: { borderBottomColor: Dark.surfaceBorder },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cream },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  rowLabelDark: { color: Dark.text },
  rowSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  rowSubDark: { color: Dark.textSoft },
  rowArrow: { fontFamily: Fonts.body, fontSize: 20, color: Colors.textSoft, fontWeight: '300' },

  // Logout
  logoutBtn: {
    marginTop: 4, paddingVertical: 14, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.card,
    borderWidth: 1, borderColor: Colors.terraLight,
  },
  logoutBtnDark: {},
  logoutText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.terra },
  logoutTextDark: { color: Dark.terra },

  trustBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(0,120,80,0.07)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(0,120,80,0.15)',
    padding: 14, marginBottom: 8,
  },
  trustBoxDark: { backgroundColor: 'rgba(0,180,100,0.08)', borderColor: 'rgba(0,180,100,0.2)' },
  trustIcon: { fontSize: 16, marginTop: 1 },
  trustText: { flex: 1, fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, lineHeight: 18 },
  trustTextDark: { color: Dark.textSoft },
  trustBold: { fontWeight: '700' },

  version: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, textAlign: 'center', marginTop: 20 },
  versionDark: { color: Dark.textSoft },
})
