import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Modal, StyleSheet,
  Switch, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useDevStore, DevLog } from '@/store/devStore'
import { useAuthStore } from '@/store/authStore'
import { getDb } from '@/lib/db'
import { syncEngine } from '@/lib/sync'
import { INITIAL_API_URL } from '@/constants/Config'
import { Colors, Fonts, Radius, Spacing, Shadow } from '@/constants/theme'

const LEVEL_COLOR: Record<string, string> = {
  info: Colors.sage,
  warn: Colors.gold,
  error: Colors.terra,
  sync: Colors.inkLight,
}

function LogEntry({ log }: { log: DevLog }) {
  const time = log.ts.toLocaleTimeString('fr-FR')
  return (
    <View style={logStyles.row}>
      <Text style={logStyles.time}>{time}</Text>
      <View style={[logStyles.dot, { backgroundColor: LEVEL_COLOR[log.level] ?? Colors.textSoft }]} />
      <Text style={logStyles.msg} numberOfLines={3}>{log.message}</Text>
    </View>
  )
}

export function DevMenu() {
  const {
    apiUrl, logs, useMock, isDevMenuVisible,
    setApiUrl, resetApiUrl, addLog, clearLogs, setUseMock, showDevMenu, hideDevMenu,
  } = useDevStore()

  const [tmpUrl, setTmpUrl] = useState(apiUrl)
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'db'>('config')

  useEffect(() => {
    setTmpUrl(apiUrl)
  }, [apiUrl])

  async function handleClearDb() {
    Alert.alert('Vider la base locale', 'Toutes les données non synchronisées seront perdues.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider', style: 'destructive',
        onPress: async () => {
          const db = await getDb()
          await db.execAsync(`
            DELETE FROM ventes_locales;
            DELETE FROM frais_locaux;
            DELETE FROM sync_queue;
            DELETE FROM sessions;
            DELETE FROM articles;
          `)
          addLog('warn', 'Base locale vidée')
        },
      },
    ])
  }

  const logout = useAuthStore(s => s.logout)

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ])
  }

  async function handleClearStorage() {
    Alert.alert(
      'Vider le stockage',
      'Tout le cache local (base SQLite + token) sera supprimé. Vous serez déconnecté.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout vider', style: 'destructive',
          onPress: async () => {
            const db = await getDb()
            await db.execAsync(`
              DELETE FROM ventes_locales;
              DELETE FROM frais_locaux;
              DELETE FROM sync_queue;
              DELETE FROM sessions;
              DELETE FROM articles;
            `)
            await logout()
            addLog('warn', 'Stockage local vidé, déconnecté')
          },
        },
      ],
    )
  }

  async function handleForceSync() {
    addLog('sync', 'Sync forcée…')
    await syncEngine.enqueue('_manual', '_', 'sync', {})
    addLog('sync', 'Sync forcée terminée')
  }

  return (
    <Modal visible={isDevMenuVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.shell}>
        <LinearGradient colors={[Colors.inkDeep, Colors.ink, Colors.inkLight]} style={styles.bg} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Menu développeur</Text>
            <Text style={styles.sub}>Outils de debug & configuration</Text>
          </View>
          <TouchableOpacity onPress={hideDevMenu} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['config', 'logs', 'db'] as const).map(t => (
            <TouchableOpacity key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'config' ? '⚙ Config' : t === 'logs' ? '📜 Logs' : '🗄 Base'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.body}>
          {activeTab === 'config' && (
            <View style={styles.section}>
              <Text style={styles.label}>URL de l'API</Text>
              <TextInput style={styles.input} value={tmpUrl} onChangeText={setTmpUrl}
                placeholder="http://192.168.x.x:3001" placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none" keyboardType="url" />
              <View style={styles.urlBtnRow}>
                <TouchableOpacity style={[styles.btn, styles.urlBtn]} onPress={() => setApiUrl(tmpUrl.trim())}>
                  <Text style={styles.btnText}>Appliquer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.urlBtn]} onPress={() => { resetApiUrl(); setTmpUrl(INITIAL_API_URL) }}>
                  <Text style={styles.btnText}>Réinitialiser</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Mode mock</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Utiliser les données mock au lieu de l'API</Text>
                <Switch value={useMock} onValueChange={setUseMock}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.sage }}
                  thumbColor={Colors.white} />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Infos app</Text>
                <Text style={styles.infoText}>Version : 0.0.1</Text>
                <Text style={styles.infoText}>API : {apiUrl}</Text>
                <Text style={styles.infoText}>Sync pending : {syncEngine.pendingCount}</Text>
              </View>
            </View>
          )}

          {activeTab === 'logs' && (
            <View style={styles.section}>
              <View style={styles.logActions}>
                <TouchableOpacity onPress={clearLogs} style={styles.btnSm}>
                  <Text style={styles.btnSmText}>✕ Vider</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForceSync} style={[styles.btnSm, styles.btnSmSync]}>
                  <Text style={[styles.btnSmText, styles.btnSmSyncText]}>↻ Forcer sync</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
                {logs.length === 0 && (
                  <Text style={styles.emptyLogs}>Aucun log. Les événements apparaîtront ici.</Text>
                )}
                {logs.map(log => <LogEntry key={log.id} log={log} />)}
              </ScrollView>
            </View>
          )}

          {activeTab === 'db' && (
            <View style={styles.section}>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleClearDb}>
                <Text style={styles.btnText}>Vider la base locale</Text>
              </TouchableOpacity>
              <Text style={styles.dbHint}>
                Supprime toutes les ventes, frais et sessions locales non synchronisées.{'\n'}
                Les données déjà synchronisées sur le serveur ne sont pas affectées.
              </Text>

              <View style={{ height: 16 }} />

              <TouchableOpacity style={[styles.btn, { backgroundColor: '#C03030' }]} onPress={handleClearStorage}>
                <Text style={styles.btnText}>Vider le stockage (cache)</Text>
              </TouchableOpacity>
              <Text style={styles.dbHint}>
                Supprime la base locale ET le token. L'app revient à l'écran de connexion.
              </Text>

              <View style={{ height: 16 }} />

              <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.terra }]} onPress={handleLogout}>
                <Text style={styles.btnText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.ink },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontFamily: Fonts.displayItalic, fontSize: 24, color: Colors.white, fontStyle: 'italic' },
  sub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },

  tabBar: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: Colors.white },

  body: { flex: 1, padding: 24 },
  section: { flex: 1 },
  label: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 10,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
  btnDanger: { backgroundColor: Colors.terra },
  urlBtn: { flex: 1, backgroundColor: Colors.sage },
  urlBtnRow: { flexDirection: 'row', gap: 8 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginRight: 12 },

  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoText: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },

  logActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  btnSm: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  btnSmText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  btnSmSync: { backgroundColor: Colors.inkLight },
  btnSmSyncText: { color: Colors.white },
  logList: { flex: 1 },
  emptyLogs: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 },

  dbHint: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16, lineHeight: 18 },
})

const logStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8 },
  time: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 56, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  msg: { flex: 1, fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },
})
