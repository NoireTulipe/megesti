import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  usePointsDeVente, fetchCategoriesPointDeVente,
  CategoriePointDeVente, CreatePointDeVenteInput,
} from '@/hooks/useLocalSession'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Gradients } from '@/constants/theme'

export default function PointDeVenteNewScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { create } = usePointsDeVente()

  const [categories, setCategories] = useState<CategoriePointDeVente[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  // Champs
  const [nom, setNom] = useState('')
  const [categorieId, setCategorieId] = useState<string | null>(null)
  const [commissionFixe, setCommissionFixe] = useState('')
  const [commissionPourcent, setCommissionPourcent] = useState('')
  const [encaissementDirect, setEncaissementDirect] = useState(true)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCategoriesPointDeVente()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!nom.trim()) e.nom = 'Le nom est requis'
    const cp = parseFloat(commissionPourcent.replace(',', '.'))
    if (commissionPourcent && (isNaN(cp) || cp < 0 || cp > 100)) e.commissionPourcent = '0 à 100'
    const cf = parseFloat(commissionFixe.replace(',', '.'))
    if (commissionFixe && (isNaN(cf) || cf < 0)) e.commissionFixe = 'Montant invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [nom, commissionPourcent, commissionFixe])

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const input: CreatePointDeVenteInput = {
        nom: nom.trim(),
        categorieId,
        commissionFixe: commissionFixe ? parseFloat(commissionFixe.replace(',', '.')) : null,
        commissionPourcent: commissionPourcent ? parseFloat(commissionPourcent.replace(',', '.')) : null,
        encaissementDirect,
      }
      await create(input)
      Alert.alert('Point de vente créé', `« ${nom.trim()} » est disponible.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      // 402 = le plan ne permet pas "encaissement par le PDV"
      if (err?.status === 402) {
        Alert.alert('Plan insuffisant', 'L\'encaissement par le point de vente nécessite le plan Édition. Choisissez « Encaissement direct » ou upgradez votre abonnement.')
        setSaving(false)
        return
      }
      Alert.alert('Erreur', err?.message ?? 'Impossible de créer le point de vente.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = [s.input, isDark && s.inputDark]

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? Gradients.sessionsDark : Gradients.sessions}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.hero, { paddingTop: 48 + insets.top }]}>
        <View style={s.heroTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={s.heroTitle}>Nouveau point de vente</Text>
          <View style={{ width: 70 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {loadingMeta ? (
            <ActivityIndicator color={Colors.sage} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Nom */}
              <Text style={[s.label, isDark && s.labelDark]}>Nom *</Text>
              <View style={[s.field, isDark && s.fieldDark, errors['nom'] && s.fieldError]}>
                <TextInput style={inputStyle} value={nom} onChangeText={setNom}
                  placeholder="Librairie de la Mairie…" placeholderTextColor={Colors.textSoft} autoFocus />
              </View>
              {errors['nom'] ? <Text style={s.errorTxt}>{errors['nom']}</Text> : null}

              {/* Catégorie */}
              {categories.length > 0 && (
                <>
                  <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Catégorie</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
                    <TouchableOpacity
                      style={[s.chip, !categorieId && s.chipActive]}
                      onPress={() => setCategorieId(null)}>
                      <Text style={[s.chipText, !categorieId && s.chipTextActive]}>Aucune</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity key={c.id}
                        style={[s.chip, categorieId === c.id && s.chipActive]}
                        onPress={() => setCategorieId(c.id)}>
                        <Text style={[s.chipText, categorieId === c.id && s.chipTextActive]}>{c.nom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Commissions */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, isDark && s.labelDark]}>Commission fixe (€)</Text>
                  <View style={[s.field, isDark && s.fieldDark, errors['commissionFixe'] && s.fieldError]}>
                    <TextInput style={inputStyle} value={commissionFixe} onChangeText={setCommissionFixe}
                      placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />
                  </View>
                  {errors['commissionFixe'] ? <Text style={s.errorTxt}>{errors['commissionFixe']}</Text> : null}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.label, isDark && s.labelDark]}>Commission (%)</Text>
                  <View style={[s.field, isDark && s.fieldDark, errors['commissionPourcent'] && s.fieldError]}>
                    <TextInput style={inputStyle} value={commissionPourcent} onChangeText={setCommissionPourcent}
                      placeholder="0" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />
                  </View>
                  {errors['commissionPourcent'] ? <Text style={s.errorTxt}>{errors['commissionPourcent']}</Text> : null}
                </View>
              </View>

              {/* Encaissement */}
              <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Encaissement</Text>
              <TouchableOpacity
                style={[s.option, encaissementDirect && s.optionActive, isDark && s.optionDark]}
                onPress={() => setEncaissementDirect(true)} activeOpacity={0.7}>
                <Text style={[s.optionTitle, encaissementDirect && s.optionTitleActive]}>💳 Direct par la ME</Text>
                <Text style={s.optionSub}>Le client paie à votre caisse MeGesti.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.option, !encaissementDirect && s.optionActive, isDark && s.optionDark]}
                onPress={() => setEncaissementDirect(false)} activeOpacity={0.7}>
                <Text style={[s.optionTitle, !encaissementDirect && s.optionTitleActive]}>🏬 Par le point de vente</Text>
                <Text style={s.optionSub}>Le PDV encaisse et vous reverse (plan Édition requis).</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {!loadingMeta && (
          <View style={[s.footer, { paddingBottom: 20 + insets.bottom }, isDark && { backgroundColor: Dark.surface }]}>
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={saving ? [Colors.textSoft, Colors.textSoft] : Gradients.sessions}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                {saving
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={s.saveBtnTxt}>Créer le point de vente</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  hero: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { paddingVertical: 6 },
  backTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.white, fontWeight: '600' },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 20, color: Colors.white, fontStyle: 'italic' },

  content: { padding: 20 },
  label: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  labelDark: { color: 'rgba(255,255,255,0.6)' },
  field: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(196,132,122,0.15)', paddingHorizontal: 14, marginBottom: 4 },
  fieldDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' },
  fieldError: { borderColor: Colors.terra },
  input: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, paddingVertical: 13 },
  inputDark: { color: Colors.white },
  errorTxt: { fontFamily: Fonts.body, fontSize: 11, color: Colors.terra, marginTop: 2, marginBottom: 4 },

  row2: { flexDirection: 'row', marginTop: 16 },

  chipsRow: { flexDirection: 'row', flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { borderColor: Colors.sage, backgroundColor: '#EAF0E6' },
  chipText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },
  chipTextActive: { color: Colors.sage },

  option: { padding: 16, borderRadius: Radius.md, backgroundColor: Colors.white, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  optionDark: { backgroundColor: 'rgba(255,255,255,0.06)' },
  optionActive: { borderColor: Colors.sage, backgroundColor: '#EAF0E6' },
  optionTitle: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.textMid },
  optionTitleActive: { color: Colors.sage },
  optionSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, marginTop: 4 },

  footer: { paddingHorizontal: 20, paddingTop: 14, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  saveBtn: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white },
})
