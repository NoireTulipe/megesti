import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { useLocalSession, usePointsDeVente } from '@/hooks/useLocalSession'
import { useLocalVentes } from '@/hooks/useLocalVentes'
import { SyncBadge } from '@/components/SyncBadge'
import { BarcodeIcon } from '@/components/BarcodeIcon'
import { api } from '@/lib/api'
import { Config } from '@/constants/Config'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'
import { useAppTheme } from '@/hooks/useAppTheme'

// Logo megesti (branding appli fixe)
const MEGESTI_LOGO = require('../../assets/images/logo.png')

const QUICK_ACTIONS = [
  { emoji: '📖', label: 'Scanner',  accent: '#6C5CE7',    bg: '#F0EEFA',        route: null, icon: 'barcode' },
  { emoji: '📦', label: 'Stock',    accent: Colors.sage,  bg: Colors.sageLight, route: '/catalogue' as any },
  { emoji: '📊', label: 'Bilan',    accent: Colors.gold,  bg: Colors.goldLight, route: '/bilan'     as any },
  { emoji: '⚙️', label: 'Réglages', accent: Colors.inkLight, bg: Colors.inkFaint, route: '/settings' as any },
]

function buildUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const base = Config.apiBaseUrl.replace(/\/api\/?$/, '')
  return `${base}${path}`
}

// ─── Écran ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets    = useSafeAreaInsets()
  const TAB_BAR_H = 68 + insets.bottom

  const { isDark, colors } = useAppTheme()
  const user        = useAuthStore(s => s.user)
  const refreshUser = useAuthStore(s => s.refreshUser)
  const showDevMenu = useDevStore(s => s.showDevMenu)

  const { session, refresh: refreshSession } = useLocalSession()
  const { pdvs } = usePointsDeVente()
  const { ventes,  refresh: refreshVentes  } = useLocalVentes()

  // Logo et nom de la ME depuis /mon-tenant
  const [meLogo, setMeLogo] = useState<string | null>(null)

  // CA serveur (source de vérité)
  const [caServeur,    setCaServeur]    = useState<number | null>(null)
  const [caFromServer, setCaFromServer] = useState(false)

  useFocusEffect(useCallback(() => {
    // Ne pas retourner de Promise — React l'interprèterait comme une cleanup function
    void (async () => {
      refreshUser().catch(() => {})
      refreshSession()
      refreshVentes()
      const sid = session?.id
      if (sid) {
        api.get<any>(`/sessions-caisse/${sid}`)
          .then(s => {
            const ca = s.ventes?.filter((v: any) => v.statut !== 'ANNULEE').reduce((sum: number, v: any) => sum + (Number(v.totalTTC) || 0), 0) ?? 0
            setCaServeur(ca)
            setCaFromServer(true)
          })
          .catch(() => { setCaServeur(null); setCaFromServer(false) })
      }
      api.get<{ logo: string | null }>('/mon-tenant')
        .then(d => setMeLogo(buildUrl(d.logo)))
        .catch(() => {})
    })()
  }, [refreshSession, refreshVentes, refreshUser, session?.id]))

  // Stats session courante.
  // En ligne : CA serveur + delta local (ventes en attente de synchro, synced=0).
  // Hors ligne : fallback sur le cache local complet.
  const ventesSession = ventes.filter(v => v.session_id === session?.id && v.statut !== 'ANNULEE')
  const ventesDelta   = ventesSession.filter(v => !v.synced)
  const caDelta       = ventesDelta.reduce((s, v) => s + v.total_ttc, 0)
  const caLocal       = ventesSession.reduce((s, v) => s + v.total_ttc, 0)
  const caSession     = caFromServer && caServeur != null ? caServeur + caDelta : caLocal
  const articleCount  = session?.articles_exposes
    ? (JSON.parse(session.articles_exposes) as string[]).length : 0

  // ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>

      <LinearGradient
        colors={isDark
          ? [Dark.bgGradient[0], Dark.bgGradient[1], Dark.bg, Dark.bg]
          : ['#F6EAE6', '#FBF5F0', Colors.cream, Colors.cream]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.bg}
      />

      {/* ══ HERO ═════════════════════════════════════════════════════ */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>

        {/* Logo megesti — DevMenu au long-press */}
        <TouchableOpacity
          onLongPress={showDevMenu}
          delayLongPress={1500}
          activeOpacity={1}>
          <Image
            source={MEGESTI_LOGO}
            style={styles.megestiLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        {/* Bonjour + nom ME */}
        <Text style={[styles.greeting, isDark && { color: Dark.text }]} numberOfLines={1}>
          Bonjour,{'  '}
          <Text style={[styles.greetingName, isDark && { color: Dark.accent }]}>{user?.firstName ?? ''}</Text>
        </Text>
        <Text style={[styles.tenantName, isDark && { color: Dark.textSoft }]} numberOfLines={1}>
          {user?.tenantName ?? ''}
        </Text>

        {/* Logo ME — sous le nom, affiché naturellement sans cercle */}
        {meLogo && (
          <View style={styles.meLogoWrap}>
            <Image
              source={meLogo}
              style={styles.meLogo}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        )}

      </View>

      {/* ══ SESSION ══════════════════════════════════════════════════ */}
      <View style={styles.sessionArea}>
        {session ? (
          <LinearGradient
            colors={[Colors.ink, Colors.inkLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <View style={styles.sessionBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTxt}>Session active</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/caisse')}
                style={styles.caisseBtn}
                activeOpacity={0.85}>
                <Text style={styles.caisseBtnTxt}>Caisse →</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sessionPdv} numberOfLines={1}>
              {session.point_de_vente_nom}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{ventesSession.length}</Text>
                <Text style={styles.statLbl}>ventes</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.stat}>
                <View style={styles.statValRow}>
                  <Text style={styles.statVal}>{caSession.toFixed(0)} €</Text>
                  {caFromServer && <Text style={styles.cloudIcon}> ☁️</Text>}
                </View>
                <Text style={styles.statLbl}>CA</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.stat}>
                <Text style={styles.statVal}>{articleCount}</Text>
                <Text style={styles.statLbl}>articles</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/caisse')}
            activeOpacity={0.88}
            style={styles.openWrap}>
            <LinearGradient
              colors={Gradients.caisse}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.openCard}>
              <Text style={styles.openEmoji}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.openTitle}>Ouvrir une session</Text>
                <Text style={styles.openSub}>Commencez à enregistrer vos ventes</Text>
              </View>
              <Text style={styles.openArrow}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* ══ ACCÈS RAPIDE ════════════════════════════════════════════ */}
      <View style={styles.actionsArea}>
        <Text style={styles.actionsLabel}>Accès rapide</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(a => {
            const isScanner = (a as any).icon === 'barcode'
            const disabled = isScanner && !session
            const onPress = isScanner
              ? () => {
                  const pdv = pdvs.find(p => p.id === session!.point_de_vente_id)
                  router.push(`/scanner?mode=vente&sessionId=${session!.id}&encaissementDirect=${pdv?.encaissementDirect ?? false}`)
                }
              : () => router.push(a.route)
            return (
              <TouchableOpacity
                key={a.label}
                style={[styles.actionBtn, { backgroundColor: isDark ? Dark.surface : a.bg }, disabled && styles.actionBtnDisabled]}
                onPress={disabled ? undefined : onPress}
                activeOpacity={disabled ? 1 : 0.75}>
                {isScanner
                  ? <BarcodeIcon size={22} color={disabled ? Colors.textSoft : '#6C5CE7'} />
                  : <Text style={styles.actionEmoji}>{a.emoji}</Text>
                }
                <Text style={[styles.actionLabel, { color: isDark && isScanner ? '#B8A6FF' : a.accent }, disabled && styles.actionLabelDisabled]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <View style={[styles.footer, { paddingBottom: TAB_BAR_H + 6 }]}>
        <SyncBadge />
      </View>

    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg:   { ...StyleSheet.absoluteFillObject },

  // ── Hero ─────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
  },

  // Logo megesti (branding appli)
  megestiLogo: {
    width: 280,
    height: 84,
    marginBottom: 16,
  },

  // Logo ME — sans cercle, intégré naturellement sous le logo megesti
  meLogoWrap: {
    width: '70%',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDark,
  },
  meLogo: {
    width: '100%',
    height: 40,
  },

  greeting: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMid,
  },
  greetingName: {
    fontFamily: Fonts.displayItalic,
    fontSize: 20,
    fontStyle: 'italic',
    color: Colors.ink,
  },
  tenantName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 2,
  },

  // ── Session ───────────────────────────────────────────────────────────
  sessionArea: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  sessionCard: {
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.float,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.sage },
  liveTxt: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.white },
  caisseBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  caisseBtnTxt: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.white },
  sessionPdv: {
    fontFamily: Fonts.displayItalic,
    fontSize: 20,
    fontStyle: 'italic',
    color: Colors.white,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '700', color: Colors.white },
  statValRow: { flexDirection: 'row', alignItems: 'center' },
  cloudIcon: { fontSize: 11 },
  statLbl: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },

  openWrap: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.card },
  openCard: { flexDirection: 'row', alignItems: 'center', padding: 22, gap: 14 },
  openEmoji: { fontSize: 32 },
  openTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, fontStyle: 'italic', color: Colors.white },
  openSub:   { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  openArrow: { fontFamily: Fonts.body, fontSize: 28, color: 'rgba(255,255,255,0.5)', fontWeight: '200' },

  // ── Accès rapide ──────────────────────────────────────────────────────
  actionsArea: { paddingHorizontal: 20, paddingBottom: 8 },
  actionsLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    width: '47.5%',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionEmoji: { fontSize: 26 },
  actionLabel: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700' },
  actionBtnDisabled: { opacity: 0.4 },
  actionLabelDisabled: { opacity: 0.5 },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: { alignItems: 'center', paddingTop: 4 },
})
