import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, Modal,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getDb } from '@/lib/db'
import { Colors, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'

// ─── Types ────────────────────────────────────────────────────────────

type PeriodMode = 'month' | 'year' | 'custom'

interface Totaux {
  ca: number; venteCount: number; fraisTotal: number; net: number
  sessionCount: number; panierMoyen: number
}

interface ModePaiement { mode: string; ca: number; count: number }
interface TopArticle   { nom: string; qty: number; ca: number }
interface ParPdv       { nom: string; ca: number; count: number }
interface ParMois      { label: string; moisKey: string; ca: number; count: number }
interface SessionRow   { session_id: string; pdv: string; date: string; venteCount: number; ca: number; frais: number }

interface BilanData {
  totaux: Totaux
  parMode: ModePaiement[]
  topArticles: TopArticle[]
  parPdv: ParPdv[]
  parMois: ParMois[]
  sessions: SessionRow[]
}

const MODE_EMOJI: Record<string, string> = { CB: '💳', ESPECES: '💶', CHEQUE: '📝', SUMUP: '📱', VIREMENT: '🏦', PDV: '🏪' }
const MODE_LABEL: Record<string, string> = { CB: 'Carte', ESPECES: 'Espèces', CHEQUE: 'Chèque', SUMUP: 'SumUp', VIREMENT: 'Virement', PDV: 'PDV' }
const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtMonthYear(d: Date): string {
  return `${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`
}
function isoRangeForMonth(d: Date): [string, string] {
  const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0)
  const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
  return [from.toISOString(), to.toISOString()]
}
function isoRangeForYear(y: number): [string, string] {
  return [
    new Date(y, 0, 1, 0, 0, 0).toISOString(),
    new Date(y, 11, 31, 23, 59, 59).toISOString(),
  ]
}

// ─── Requête SQLite ───────────────────────────────────────────────────

async function loadBilan(from: string, to: string, mode: PeriodMode): Promise<BilanData> {
  const db = await getDb()

  const [ventesRows, fraisRow, sessionsRows] = await Promise.all([
    db.getAllAsync<{ id: string; mode_paiement: string; total_ttc: number; lignes_json: string; session_id: string | null; date_vente: string }>(
      `SELECT id, mode_paiement, total_ttc, lignes_json, session_id, date_vente
       FROM ventes_locales WHERE date_vente BETWEEN ? AND ? ORDER BY date_vente`,
      [from, to],
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(montant_ht),0) as total FROM frais_locaux WHERE date BETWEEN ? AND ?`,
      [from, to],
    ),
    db.getAllAsync<{ session_id: string; pdv: string | null; date_ouverture: string; frais: number }>(
      `SELECT s.id as session_id, s.point_de_vente_nom as pdv, s.date_ouverture,
              COALESCE((SELECT SUM(f.montant_ht) FROM frais_locaux f WHERE f.session_id = s.id),0) as frais
       FROM sessions s
       WHERE s.date_ouverture BETWEEN ? AND ?
       ORDER BY s.date_ouverture DESC`,
      [from, to],
    ),
  ])

  const ca       = ventesRows.reduce((s, v) => s + v.total_ttc, 0)
  const fraisTotal = fraisRow?.total ?? 0

  // Par mode de paiement
  const modeMap = new Map<string, { ca: number; count: number }>()
  for (const v of ventesRows) {
    const ex = modeMap.get(v.mode_paiement) ?? { ca: 0, count: 0 }
    modeMap.set(v.mode_paiement, { ca: ex.ca + v.total_ttc, count: ex.count + 1 })
  }
  const parMode: ModePaiement[] = Array.from(modeMap.entries())
    .map(([mode, d]) => ({ mode, ...d }))
    .sort((a, b) => b.ca - a.ca)

  // Top articles (parse lignes_json en JS)
  const artMap = new Map<string, { qty: number; ca: number }>()
  for (const v of ventesRows) {
    try {
      const lignes: any[] = JSON.parse(v.lignes_json)
      for (const l of lignes) {
        const ex = artMap.get(l.nom) ?? { qty: 0, ca: 0 }
        artMap.set(l.nom, { qty: ex.qty + l.quantite, ca: ex.ca + (l.totalTTC ?? l.prixUnitaireHT * l.quantite) })
      }
    } catch {}
  }
  const topArticles: TopArticle[] = Array.from(artMap.entries())
    .map(([nom, d]) => ({ nom, ...d }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)

  // Par PDV
  const pdvMap = new Map<string, { ca: number; count: number }>()
  const sessionVentesMap = new Map<string, { ca: number; count: number }>()
  for (const v of ventesRows) {
    if (!v.session_id) continue
    const ex = sessionVentesMap.get(v.session_id) ?? { ca: 0, count: 0 }
    sessionVentesMap.set(v.session_id, { ca: ex.ca + v.total_ttc, count: ex.count + 1 })
  }
  for (const s of sessionsRows) {
    const nom = s.pdv ?? 'Sans PDV'
    const sv  = sessionVentesMap.get(s.session_id) ?? { ca: 0, count: 0 }
    const ex  = pdvMap.get(nom) ?? { ca: 0, count: 0 }
    pdvMap.set(nom, { ca: ex.ca + sv.ca, count: ex.count + sv.count })
  }
  const parPdv: ParPdv[] = Array.from(pdvMap.entries())
    .map(([nom, d]) => ({ nom, ...d }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5)

  // Par mois (pour vue annuelle)
  const moisMap = new Map<string, { label: string; ca: number; count: number }>()
  if (mode === 'year') {
    for (const v of ventesRows) {
      const d = new Date(v.date_vente)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`
      const ex = moisMap.get(key) ?? { label, ca: 0, count: 0 }
      moisMap.set(key, { ...ex, ca: ex.ca + v.total_ttc, count: ex.count + 1 })
    }
  }
  const parMois: ParMois[] = Array.from(moisMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([moisKey, d]) => ({ moisKey, ...d }))

  // Top 5 sessions par CA
  const sessions: SessionRow[] = sessionsRows
    .map(s => {
      const sv = sessionVentesMap.get(s.session_id) ?? { ca: 0, count: 0 }
      return { session_id: s.session_id, pdv: s.pdv ?? 'Sans PDV', date: s.date_ouverture, venteCount: sv.count, ca: sv.ca, frais: s.frais }
    })
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5)

  return {
    totaux: {
      ca, venteCount: ventesRows.length, fraisTotal,
      net: ca - fraisTotal,
      sessionCount: sessionsRows.length,
      panierMoyen: ventesRows.length > 0 ? ca / ventesRows.length : 0,
    },
    parMode, topArticles, parPdv, parMois, sessions,
  }
}

// ─── Composants ───────────────────────────────────────────────────────

function ModeBar({ item, maxCa }: { item: ModePaiement; maxCa: number }) {
  const pct = maxCa > 0 ? item.ca / maxCa : 0
  return (
    <View style={mb.row}>
      <Text style={mb.emoji}>{MODE_EMOJI[item.mode] ?? '💰'}</Text>
      <View style={{ flex: 1 }}>
        <View style={mb.labelRow}>
          <Text style={mb.label}>{MODE_LABEL[item.mode] ?? item.mode}</Text>
          <Text style={mb.count}>{item.count} vte{item.count > 1 ? 's' : ''}</Text>
          <Text style={mb.ca}>{item.ca.toFixed(0)} €</Text>
        </View>
        <View style={mb.track}>
          <View style={[mb.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
      </View>
    </View>
  )
}
const mb = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  emoji:    { fontSize: 18, width: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  label:    { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.text, flex: 1 },
  count:    { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  ca:       { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.gold, minWidth: 56, textAlign: 'right' },
  track:    { height: 6, backgroundColor: Colors.creamDark, borderRadius: 3 },
  fill:     { height: 6, backgroundColor: Colors.gold, borderRadius: 3 },
})

function MonthBars({ data }: { data: ParMois[] }) {
  const maxCa = Math.max(...data.map(d => d.ca), 1)
  return (
    <View>
      {data.map(d => (
        <View key={d.moisKey} style={ch.row}>
          <Text style={ch.label}>{d.label}</Text>
          <View style={ch.track}>
            <View style={[ch.fill, { width: `${Math.round(d.ca / maxCa * 100)}%` }]} />
          </View>
          <Text style={ch.ca}>{d.ca.toFixed(0)} €</Text>
        </View>
      ))}
    </View>
  )
}
const ch = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, width: 36 },
  track: { flex: 1, height: 8, backgroundColor: Colors.creamDark, borderRadius: 4 },
  fill:  { height: 8, backgroundColor: Colors.gold, borderRadius: 4, minWidth: 4 },
  ca:    { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.text, width: 56, textAlign: 'right' },
})

// ─── Sélecteur mois/année (picker) ───────────────────────────────────

function MonthPickerModal({ visible, value, onSelect, onClose }: {
  visible: boolean; value: Date
  onSelect: (d: Date) => void; onClose: () => void
}) {
  const [year, setYear] = useState(value.getFullYear())
  useEffect(() => { if (visible) setYear(value.getFullYear()) }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={mp.overlay} activeOpacity={1} onPress={onClose}>
        <View style={mp.card} onStartShouldSetResponder={() => true}>
          {/* Navigation année */}
          <View style={mp.yearRow}>
            <TouchableOpacity onPress={() => setYear(y => y - 1)} style={mp.yearBtn} activeOpacity={0.6}>
              <Text style={mp.arrow}>‹</Text>
            </TouchableOpacity>
            <Text style={mp.yearLabel}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(y => y + 1)} style={mp.yearBtn} activeOpacity={0.6}>
              <Text style={mp.arrow}>›</Text>
            </TouchableOpacity>
          </View>
          {/* Grille des mois */}
          <View style={mp.grid}>
            {MOIS_COURT.map((label, i) => {
              const isActive = value.getMonth() === i && value.getFullYear() === year
              return (
                <TouchableOpacity key={i}
                  style={[mp.monthBtn, isActive && mp.monthBtnActive]}
                  onPress={() => { onSelect(new Date(year, i, 1)); onClose() }}
                  activeOpacity={0.7}>
                  <Text style={[mp.monthTxt, isActive && mp.monthTxtActive]}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity style={mp.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={mp.closeTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
const mp = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(44,33,24,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:         { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, width: '100%', maxWidth: 320, ...Shadow.float },
  yearRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  yearBtn:      { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.goldLight, justifyContent: 'center', alignItems: 'center' },
  arrow:        { fontSize: 20, color: Colors.gold, fontWeight: '300' },
  yearLabel:    { fontFamily: Fonts.displayItalic, fontSize: 20, fontStyle: 'italic', color: Colors.gold, minWidth: 60, textAlign: 'center' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  monthBtn:     { width: '22%', paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.cream, alignItems: 'center' },
  monthBtnActive: { backgroundColor: Colors.gold },
  monthTxt:     { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.textMid },
  monthTxtActive: { color: Colors.white },
  closeBtn:     { backgroundColor: Colors.cream, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  closeTxt:     { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },
})

// ─── Sélecteur de période ─────────────────────────────────────────────

interface PeriodPickerProps {
  mode: PeriodMode; onMode: (m: PeriodMode) => void
  refDate: Date; onRefDate: (d: Date) => void
  customFrom: Date; customTo: Date
  onCustomFrom: (d: Date) => void; onCustomTo: (d: Date) => void
  onApplyCustom: () => void
}

function PeriodPicker({ mode, onMode, refDate, onRefDate, customFrom, customTo, onCustomFrom, onCustomTo, onApplyCustom }: PeriodPickerProps) {
  const [pickerFor, setPickerFor] = useState<'month' | 'from' | 'to' | null>(null)

  function shiftYear(delta: number) {
    const d = new Date(refDate)
    d.setFullYear(d.getFullYear() + delta)
    onRefDate(d)
  }

  return (
    <>
      {/* Onglets (toujours visibles) */}
      <View style={pp.tabs}>
        {(['month', 'year', 'custom'] as PeriodMode[]).map(m => (
          <TouchableOpacity key={m} style={[pp.tab, mode === m && pp.tabActive]}
            onPress={() => onMode(m)} activeOpacity={0.7}>
            <Text style={[pp.tabTxt, mode === m && pp.tabTxtActive]}>
              {m === 'month' ? 'Mois' : m === 'year' ? 'Année' : 'Période'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode Mois : sélecteur discret, pas de cadre */}
      {mode === 'month' && (
        <TouchableOpacity
          style={[pp.pickerBtn, { backgroundColor: 'transparent', paddingVertical: 4 }]}
          onPress={() => setPickerFor('month')} activeOpacity={0.7}>
          <Text style={[pp.pickerBtnTxt, { fontSize: 14 }]}>{fmtMonthYear(refDate)}</Text>
          <Text style={pp.pickerBtnArrow}>▼</Text>
        </TouchableOpacity>
      )}

      {/* Modes Année et Période : cadre avec contenu */}
      {(mode === 'year' || mode === 'custom') && (
        <View style={pp.wrap}>
          {mode === 'year' && (
            <View style={pp.nav}>
              <TouchableOpacity onPress={() => shiftYear(-1)} style={pp.arrow} activeOpacity={0.6}>
                <Text style={pp.arrowTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={pp.navLabel}>{refDate.getFullYear()}</Text>
              <TouchableOpacity onPress={() => shiftYear(1)} style={pp.arrow} activeOpacity={0.6}>
                <Text style={pp.arrowTxt}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'custom' && (
            <View style={pp.customWrap}>
              <View style={pp.customRow}>
                <Text style={pp.customLbl}>Du</Text>
                <TouchableOpacity style={pp.pickerBtn} onPress={() => setPickerFor('from')} activeOpacity={0.8}>
                  <Text style={pp.pickerBtnTxt}>{fmtMonthYear(customFrom)}</Text>
                  <Text style={pp.pickerBtnArrow}>▼</Text>
                </TouchableOpacity>
                <Text style={pp.customLbl}>au</Text>
                <TouchableOpacity style={pp.pickerBtn} onPress={() => setPickerFor('to')} activeOpacity={0.8}>
                  <Text style={pp.pickerBtnTxt}>{fmtMonthYear(customTo)}</Text>
                  <Text style={pp.pickerBtnArrow}>▼</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={pp.applyBtn} onPress={onApplyCustom} activeOpacity={0.8}>
                <Text style={pp.applyTxt}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Modals pickers */}
      <MonthPickerModal
        visible={pickerFor === 'month'}
        value={refDate}
        onSelect={onRefDate}
        onClose={() => setPickerFor(null)}
      />
      <MonthPickerModal
        visible={pickerFor === 'from'}
        value={customFrom}
        onSelect={onCustomFrom}
        onClose={() => setPickerFor(null)}
      />
      <MonthPickerModal
        visible={pickerFor === 'to'}
        value={customTo}
        onSelect={onCustomTo}
        onClose={() => setPickerFor(null)}
      />
    </>
  )
}
const pp = StyleSheet.create({
  wrap:       { backgroundColor: 'transparent', borderRadius: Radius.lg, paddingVertical: 8, marginBottom: 0 },
  tabs:       { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab:        { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  tabActive:  { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabTxt:     { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  tabTxtActive: { color: Colors.white },
  nav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  arrow:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  arrowTxt:   { fontSize: 22, color: Colors.white, fontWeight: '300' },
  navLabel:   { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.white, fontStyle: 'italic', minWidth: 80, textAlign: 'center' },
  pickerBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 14, gap: 6 },
  pickerBtnTxt:   { fontFamily: Fonts.displayItalic, fontSize: 16, fontStyle: 'italic', color: Colors.white },
  pickerBtnArrow: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  customWrap: { gap: 10 },
  customRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customLbl:  { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 22 },
  applyBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  applyTxt:   { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.white },
})

// ─── Carte section ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sc.wrap}>
      <Text style={sc.title}>{title}</Text>
      {children}
    </View>
  )
}
const sc = StyleSheet.create({
  wrap:  { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: Radius.lg, padding: 16, marginBottom: 12, ...Shadow.card },
  title: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14 },
})

// ─── Écran principal ──────────────────────────────────────────────────

const EMPTY: BilanData = {
  totaux: { ca: 0, venteCount: 0, fraisTotal: 0, net: 0, sessionCount: 0, panierMoyen: 0 },
  parMode: [], topArticles: [], parPdv: [], parMois: [], sessions: [],
}

export default function BilanScreen() {
  const insets = useSafeAreaInsets()

  const [mode,       setMode]      = useState<PeriodMode>('month')
  const [refDate,    setRefDate]   = useState(() => new Date())
  const [customFrom, setCustomFrom] = useState(() => new Date())
  const [customTo,   setCustomTo]   = useState(() => new Date())
  const [activeRange, setActiveRange] = useState<[string, string]>(() => isoRangeForMonth(new Date()))

  const [data,       setData]       = useState<BilanData>(EMPTY)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const result = await loadBilan(activeRange[0], activeRange[1], mode)
    setData(result)
  }, [activeRange, mode])

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (mode === 'month') setActiveRange(isoRangeForMonth(refDate))
    if (mode === 'year')  setActiveRange(isoRangeForYear(refDate.getFullYear()))
  }, [mode, refDate])

  function applyCustom() {
    const from = new Date(customFrom.getFullYear(), customFrom.getMonth(), 1, 0, 0, 0).toISOString()
    const to   = new Date(customTo.getFullYear(),   customTo.getMonth() + 1, 0, 23, 59, 59).toISOString()
    setActiveRange([from, to])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const { totaux, parMode, topArticles, parPdv, parMois, sessions } = data
  const maxModeCa = parMode.length > 0 ? Math.max(...parMode.map(m => m.ca)) : 1

  return (
    <View style={styles.shell}>
      <LinearGradient colors={['#FBF5E6', Colors.cream, Colors.cream]} style={styles.bg} />

      {/* En-tête dégradé */}
      <LinearGradient
        colors={Gradients.bilan}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.heroGradient, { paddingTop: 48 + insets.top }]}>
        <Text style={styles.heroTitle}>Bilan</Text>

        <PeriodPicker
          mode={mode} onMode={setMode}
          refDate={refDate} onRefDate={setRefDate}
          customFrom={customFrom} onCustomFrom={setCustomFrom}
          customTo={customTo} onCustomTo={setCustomTo}
          onApplyCustom={applyCustom}
        />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}>


        {/* ── Carte résumé ── */}
        <LinearGradient colors={Gradients.bilan} style={styles.summaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.summaryLbl}>Net estimé</Text>
          <Text style={styles.summaryNet}>{totaux.net.toFixed(2)} €</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.si}>
              <Text style={styles.siVal}>{totaux.ca.toFixed(0)} €</Text>
              <Text style={styles.siLbl}>CA TTC</Text>
            </View>
            <View style={styles.sdiv} />
            <View style={styles.si}>
              <Text style={styles.siVal}>{totaux.venteCount}</Text>
              <Text style={styles.siLbl}>ventes</Text>
            </View>
            <View style={styles.sdiv} />
            <View style={styles.si}>
              <Text style={styles.siVal}>{totaux.panierMoyen.toFixed(0)} €</Text>
              <Text style={styles.siLbl}>panier moy.</Text>
            </View>
            <View style={styles.sdiv} />
            <View style={styles.si}>
              <Text style={styles.siVal}>{totaux.fraisTotal.toFixed(0)} €</Text>
              <Text style={styles.siLbl}>frais</Text>
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <Text style={styles.sfTxt}>{totaux.sessionCount} session{totaux.sessionCount > 1 ? 's' : ''}</Text>
          </View>
        </LinearGradient>

        {totaux.venteCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Aucune vente sur cette période</Text>
            <Text style={styles.emptySub}>Modifiez la période ou enregistrez des ventes.</Text>
          </View>
        ) : (
          <>
            {/* ── Évolution mensuelle (vue annuelle) ── */}
            {mode === 'year' && parMois.length > 0 && (
              <Section title="Évolution mensuelle">
                <MonthBars data={parMois} />
              </Section>
            )}

            {/* ── Modes de paiement ── */}
            {parMode.length > 0 && (
              <Section title="Modes de paiement">
                {parMode.map(item => (
                  <ModeBar key={item.mode} item={item} maxCa={maxModeCa} />
                ))}
              </Section>
            )}

            {/* ── Top articles ── */}
            {topArticles.length > 0 && (
              <Section title={`Top articles (${topArticles.length})`}>
                {topArticles.map((a, i) => (
                  <View key={i} style={styles.artRow}>
                    <View style={styles.artRank}>
                      <Text style={styles.artRankTxt}>{i + 1}</Text>
                    </View>
                    <Text style={styles.artNom} numberOfLines={2}>{a.nom}</Text>
                    <View style={styles.artRight}>
                      <Text style={styles.artQty}>×{a.qty}</Text>
                      <Text style={styles.artCa}>{a.ca.toFixed(0)} €</Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {/* ── Top points de vente ── */}
            {parPdv.length > 0 && (
              <Section title={`Top points de vente (${parPdv.length})`}>
                {parPdv.map((p, i) => (
                  <View key={i} style={styles.pdvRow}>
                    <Text style={styles.pdvNom} numberOfLines={1}>{p.nom}</Text>
                    <Text style={styles.pdvCount}>{p.count} vte{p.count > 1 ? 's' : ''}</Text>
                    <Text style={styles.pdvCa}>{p.ca.toFixed(0)} €</Text>
                  </View>
                ))}
              </Section>
            )}

            {/* ── Top sessions ── */}
            {sessions.length > 0 && (
              <Section title={`Top sessions (${sessions.length})`}>
                {sessions.map((s, i) => (
                  <View key={s.session_id} style={[styles.sesRow, i < sessions.length - 1 && styles.sesRowBorder]}>
                    <View style={styles.sesLeft}>
                      <Text style={styles.sesPdv} numberOfLines={1}>{s.pdv}</Text>
                      <Text style={styles.sesDate}>{fmtDate(s.date)}</Text>
                      {s.frais > 0 && <Text style={styles.sesFrais}>Frais : {s.frais.toFixed(0)} €</Text>}
                    </View>
                    <View style={styles.sesRight}>
                      <Text style={styles.sesCa}>{s.ca.toFixed(0)} €</Text>
                      <Text style={styles.sesVentes}>{s.venteCount} vte{s.venteCount > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg:   { ...StyleSheet.absoluteFillObject },
  heroGradient: { paddingHorizontal: 20, paddingBottom: 24, marginBottom: 16 },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },

  // Résumé gradient
  summaryCard: { marginHorizontal: 20, borderRadius: Radius.xl, padding: 22, marginBottom: 12, ...Shadow.float },
  summaryLbl:  { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  summaryNet:  { fontFamily: Fonts.displayItalic, fontSize: 44, color: Colors.white, fontStyle: 'italic', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, paddingVertical: 14, marginBottom: 12 },
  si:    { flex: 1, alignItems: 'center' },
  siVal: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },
  siLbl: { fontFamily: Fonts.body, fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'uppercase' },
  sdiv:  { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryFooter: { alignItems: 'center' },
  sfTxt: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Empty
  emptyCard:  { marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 32, alignItems: 'center', ...Shadow.card },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.textMid, fontStyle: 'italic', marginBottom: 6 },
  emptySub:   { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', lineHeight: 20 },

  // Articles
  artRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  artRank:    { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.goldLight, justifyContent: 'center', alignItems: 'center' },
  artRankTxt: { fontFamily: Fonts.body, fontSize: 10, fontWeight: '700', color: Colors.gold },
  artNom:     { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  artRight:   { alignItems: 'flex-end' },
  artQty:     { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  artCa:      { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700', color: Colors.gold },

  // PDV
  pdvRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  pdvNom:   { flex: 1, fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text },
  pdvCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft },
  pdvCa:    { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.gold, minWidth: 56, textAlign: 'right' },

  // Sessions
  sesRow:       { flexDirection: 'row', paddingVertical: 10, alignItems: 'flex-start' },
  sesRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cream },
  sesLeft:      { flex: 1 },
  sesPdv:       { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.text },
  sesDate:      { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
  sesFrais:     { fontFamily: Fonts.body, fontSize: 11, color: Colors.terra, marginTop: 2 },
  sesRight:     { alignItems: 'flex-end' },
  sesCa:        { fontFamily: Fonts.body, fontSize: 15, fontWeight: '800', color: Colors.gold },
  sesVentes:    { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 2 },
})
