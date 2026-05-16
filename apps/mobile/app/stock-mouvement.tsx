import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalArticles } from '@/hooks/useLocalArticles'
import { api } from '@/lib/api'
import { generateUUID, getDb } from '@/lib/db'
import { useDevStore } from '@/store/devStore'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'
import { useAppTheme } from '@/hooks/useAppTheme'

type TypeMouvement = 'ENTREE' | 'SORTIE_DON' | 'SORTIE_PERTE' | 'SORTIE_VOL' | 'SORTIE_DEGRADATION' | 'AJUSTEMENT'
type Mode = '-' | '=' | '+'

const MOTIFS_SORTIE: { type: TypeMouvement; label: string; emoji: string }[] = [
  { type: 'SORTIE_DON',         label: 'Don',       emoji: '🎁' },
  { type: 'SORTIE_PERTE',       label: 'Perte',     emoji: '📦' },
  { type: 'SORTIE_VOL',         label: 'Vol',       emoji: '🚨' },
  { type: 'SORTIE_DEGRADATION', label: 'Dégradation', emoji: '💧' },
]

export default function StockMouvementScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const params = useLocalSearchParams<{ articleId: string }>()
  const { articles, refresh } = useLocalArticles()
  const addLog = useDevStore(s => s.addLog)

  const article = useMemo(() => articles.find(a => a.id === params.articleId), [articles, params.articleId])
  const stockActuel = article?.stock_local ?? 0

  const [mode,      setMode]      = useState<Mode>('-')
  const [quantite,  setQuantite]  = useState(0)
  const [motifType, setMotifType] = useState(MOTIFS_SORTIE[0])
  const [note,      setNote]      = useState('')
  const [sending,   setSending]   = useState(false)

  const stockApres = (() => {
    if (mode === '=') return quantite
    if (mode === '+') return stockActuel + quantite
    return Math.max(0, stockActuel - quantite)
  })()

  const delta = stockApres - stockActuel

  const canSave = (() => {
    if (sending) return false
    if (mode === '=') return quantite >= 0 && quantite !== stockActuel
    if (mode === '+') return quantite > 0
    return quantite > 0 && quantite <= stockActuel
  })()

  async function handleSubmit() {
    if (!canSave || !article) return
    setSending(true)
    try {
      const isSortie = mode === '-'
      const payload: Record<string, unknown> = {
        id: generateUUID(),
        articleId: article.id,
        type: mode === '=' ? 'AJUSTEMENT' : mode === '+' ? 'ENTREE' : motifType.type,
      }
      if (mode === '-') {
        payload.quantite = quantite
      } else {
        payload.stockCible = stockApres
      }
      if (note) payload.motif = note
      if (isSortie) payload.creeFrais = true

      await api.post('/mouvements-stock', payload)
      addLog('info', `[stock] ${payload.type} — article=${article.id} delta=${delta}`)

      // Mettre à jour le stock local
      const db = await getDb()
      await db.runAsync('UPDATE articles SET stock_local = ? WHERE id = ?', [stockApres, article.id])
      await refresh()
      router.back()
    } catch (e: any) {
      addLog('error', `[stock] Erreur: ${e?.message}`)
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'enregistrer le mouvement.')
    } finally {
      setSending(false)
    }
  }

  if (!article) {
    return (
      <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
        <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.sageLight, Colors.cream]} style={s.bg} />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={s.center}><ActivityIndicator color={Colors.rose} size="large" /></View>
      </View>
    )
  }

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.sageLight, Colors.cream]} style={s.bg} />

      {/* Header */}
      <LinearGradient colors={[Colors.inkLight, Colors.ink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{article.nom}</Text>
          <Text style={s.headerSub}>Stock · {article.rayon_nom ?? 'Sans rayon'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Stock actuel */}
        <View style={[s.stockCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
          <Text style={[s.stockLabel, isDark && { color: Dark.textSoft }]}>Stock actuel</Text>
          <Text style={[s.stockVal, isDark && { color: Dark.text }]}>{stockActuel}</Text>
        </View>

        {/* Sélecteur de mode */}
        <View style={s.modeRow}>
          {([
            { m: '-' as Mode, label: 'Sortie',    emoji: '−', outline: '#ef4444', bg: '#fef2f2', bgDark: 'rgba(239,68,68,0.15)', text: '#dc2626' },
            { m: '=' as Mode, label: 'Affecter',  emoji: '=', outline: isDark ? 'rgba(255,255,255,0.5)' : Colors.inkLight, bg: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEFA', bgDark: 'rgba(255,255,255,0.1)', text: isDark ? Dark.text : Colors.ink },
            { m: '+' as Mode, label: 'Entrée',    emoji: '+', outline: '#22c55e', bg: '#f0fdf4', bgDark: 'rgba(34,197,94,0.12)', text: '#15803d' },
          ]).map(({ m, label, emoji, outline, bg, bgDark, text }) => {
            const active = mode === m
            return (
              <TouchableOpacity key={m}
                style={[
                  s.modeBtn,
                  { borderColor: outline },
                  active && { backgroundColor: isDark ? bgDark : bg, borderWidth: 2.5 },
                  isDark && !active && { backgroundColor: Dark.surface },
                ]}
                activeOpacity={0.7} onPress={() => { setMode(m); setQuantite(0) }}>
                <Text style={[s.modeEmoji]}>{emoji}</Text>
                <Text style={[s.modeLabel, active && { color: text, fontWeight: '700' }, isDark && !active && { color: Dark.textSoft }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Stepper quantité */}
        <View style={[s.qteCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
          <Text style={[s.qteTitle, isDark && { color: Dark.textSoft }]}>
            {mode === '=' ? 'Nouvelle valeur' : mode === '+' ? 'Quantité à ajouter' : 'Quantité à retirer'}
          </Text>
          <View style={s.qteRow}>
            <TouchableOpacity style={[s.qteBtn, isDark && { backgroundColor: Dark.bg }]}
              activeOpacity={0.6} onPress={() => setQuantite(q => Math.max(0, q - 1))}>
              <Text style={[s.qteBtnText, isDark && { color: Dark.text }]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[s.qteInput, isDark && { color: Dark.text, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: Dark.bg }]}
              keyboardType="number-pad"
              value={String(quantite)}
              onChangeText={t => setQuantite(Math.max(0, parseInt(t) || 0))}
              selectTextOnFocus
            />
            <TouchableOpacity style={[s.qteBtn, isDark && { backgroundColor: Dark.bg }]}
              activeOpacity={0.6} onPress={() => setQuantite(q => q + 1)}>
              <Text style={[s.qteBtnText, isDark && { color: Dark.text }]}>+</Text>
            </TouchableOpacity>
          </View>
          {mode === '-' && quantite > stockActuel && (
            <Text style={s.qteWarn}>⚠ Stock insuffisant ({stockActuel} dispo.)</Text>
          )}
        </View>

        {/* Motif sortie */}
        {mode === '-' && (
          <View style={s.motifSection}>
            <Text style={[s.motifTitle, isDark && { color: Dark.textSoft }]}>Raison de la sortie</Text>
            <View style={s.motifGrid}>
              {MOTIFS_SORTIE.map(m => {
                const active = motifType.type === m.type
                return (
                  <TouchableOpacity key={m.type}
                    style={[
                      s.motifCard,
                      active && { borderColor: '#ef4444', borderWidth: 2.5, backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' },
                      !active && isDark && { backgroundColor: Dark.surface, borderColor: 'rgba(255,255,255,0.08)' },
                      !active && !isDark && { borderColor: Colors.creamDark },
                    ]}
                    activeOpacity={0.7} onPress={() => setMotifType(m)}>
                    <Text style={s.motifEmoji}>{m.emoji}</Text>
                    <Text style={[
                      s.motifLabel,
                      active && { color: '#ef4444', fontWeight: '700' },
                      isDark && !active && { color: Dark.text },
                    ]}>{m.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Note libre */}
        <View style={[s.noteCard, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
          <Text style={[s.noteTitle, isDark && { color: Dark.textSoft }]}>Note (optionnel)</Text>
          <TextInput
            style={[s.noteInput, isDark && { color: Dark.text, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: Dark.bg }]}
            placeholder="Observation, référence…"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : Colors.textSoft}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Prévisualisation */}
        {(quantite > 0 || mode === '=') && (
          <View style={[s.preview, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]}>
            <View style={s.previewRow}>
              <Text style={[s.previewLabel, isDark && { color: Dark.textSoft }]}>Stock actuel</Text>
              <Text style={[s.previewVal, isDark && { color: Dark.text }]}>{stockActuel}</Text>
            </View>
            <View style={[s.previewSep, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
            <View style={s.previewRow}>
              <Text style={[s.previewLabel, isDark && { color: Dark.textSoft }]}>Stock après</Text>
              <View style={s.previewAfter}>
                <Text style={[s.previewVal, {
                  color: delta < 0 ? '#ef4444' : delta > 0 ? Colors.sage : (isDark ? Dark.text : Colors.text),
                }]}>{stockApres}</Text>
                {delta !== 0 && (
                  <Text style={[s.previewDelta, {
                    color: delta < 0 ? '#ef4444' : Colors.sage,
                  }]}>{delta > 0 ? `+${delta}` : `${delta}`}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bouton valider */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSave && s.submitBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canSave}
          onPress={handleSubmit}>
          <LinearGradient
            colors={canSave ? Gradients.caisse : ['#ccc', '#ccc']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.submitBtnBg}>
            {sending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.submitBtnText}>Enregistrer le mouvement</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 16 },

  // Stock actuel
  stockCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, alignItems: 'center',
    ...Shadow.card, marginBottom: 16,
  },
  stockLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 1 },
  stockVal: { fontFamily: Fonts.displayItalic, fontSize: 48, color: Colors.ink, fontStyle: 'italic', marginTop: 4 },

  // Mode
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 2,
    paddingVertical: 14, alignItems: 'center', gap: 4, backgroundColor: Colors.white,
  },
  modeEmoji: { fontSize: 24 },
  modeLabel: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },

  // Quantité
  qteCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, ...Shadow.card, marginBottom: 16 },
  qteTitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginBottom: 10, textAlign: 'center' },
  qteRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  qteBtn: {
    width: 48, height: 48, borderRadius: Radius.full, backgroundColor: Colors.cream,
    justifyContent: 'center', alignItems: 'center',
  },
  qteBtnText: { fontFamily: Fonts.body, fontSize: 22, fontWeight: '600', color: Colors.text },
  qteInput: {
    width: 80, height: 48, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.creamDark,
    fontFamily: Fonts.body, fontSize: 22, fontWeight: '700', color: Colors.text,
    textAlign: 'center', backgroundColor: Colors.cream,
  },
  qteWarn: { fontFamily: Fonts.body, fontSize: 11, color: '#ef4444', textAlign: 'center', marginTop: 8 },

  // Motifs sortie
  motifSection: { marginBottom: 16 },
  motifTitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginBottom: 10 },
  motifGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motifCard: {
    width: '48%', borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.creamDark,
    padding: 14, backgroundColor: Colors.white, alignItems: 'center', gap: 4,
    ...Shadow.card,
  },
  motifEmoji: { fontSize: 28 },
  motifLabel: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },

  // Note
  noteCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, ...Shadow.card, marginBottom: 16 },
  noteTitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginBottom: 8 },
  noteInput: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.creamDark, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.cream,
  },

  // Prévisualisation
  preview: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, ...Shadow.card, marginBottom: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  previewLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSoft },
  previewVal: { fontFamily: Fonts.body, fontSize: 20, fontWeight: '700' },
  previewAfter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewDelta: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700' },
  previewSep: { height: 1, backgroundColor: Colors.cream, marginVertical: 4 },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  submitBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnBg: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white },
})
