import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalArticles, fetchRayons, CreateArticleInput, Rayon } from '@/hooks/useLocalArticles'
import { useAppTheme } from '@/hooks/useAppTheme'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'

export default function ArticleNewScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const { create, uploadImage } = useLocalArticles()

  const [rayons, setRayons] = useState<Rayon[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  // Champs du formulaire
  const [rayonId, setRayonId] = useState<string | null>(null)
  const [categorieId, setCategorieId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [isbn, setIsbn] = useState('')
  const [prixVenteHT, setPrixVenteHT] = useState('')
  const [prixAchatHT, setPrixAchatHT] = useState('')
  const [stock, setStock] = useState('')
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchRayons()
      .then(setRayons)
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [])

  const selectedRayon = rayons.find(r => r.id === rayonId) ?? null
  const isLibrairie = selectedRayon?.isLibrairie ?? false

  // Réinitialise la catégorie si on change de rayon
  useEffect(() => { setCategorieId(null) }, [rayonId])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!rayonId) e.rayonId = 'Sélectionnez un rayon'
    if (!nom.trim()) e.nom = 'Le nom est requis'
    const pv = parseFloat(prixVenteHT.replace(',', '.'))
    if (isNaN(pv) || pv < 0) e.prixVenteHT = 'Prix invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [rayonId, nom, prixVenteHT])

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const input: CreateArticleInput = {
        rayonId: rayonId!,
        categorieId,
        nom: nom.trim(),
        isbn: isLibrairie ? (isbn.trim() || null) : null,
        prixVenteHT: parseFloat(prixVenteHT.replace(',', '.')),
        prixAchatHT: prixAchatHT ? parseFloat(prixAchatHT.replace(',', '.')) : null,
        stock: stock ? parseInt(stock, 10) : 0,
      }
      const id = await create(input)
      if (pendingPhotoUri) {
        await uploadImage(id, pendingPhotoUri)
      }
      Alert.alert('Article créé', `« ${nom.trim()} » a été ajouté au catalogue.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de créer l\'article.')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = [s.field, isDark && s.fieldDark, errors['nom'] && s.fieldError]
  const inputStyle = [s.input, isDark && s.inputDark]

  return (
    <View style={[s.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? Gradients.stockDark : Gradients.stock}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.hero, { paddingTop: 48 + insets.top }]}>
        <View style={s.heroTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={s.heroTitle}>Nouvel article</Text>
          <View style={{ width: 70 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {loadingMeta ? (
            <ActivityIndicator color={Colors.terra} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Rayon */}
              <Text style={[s.label, isDark && s.labelDark]}>Rayon *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
                {rayons.map(r => (
                  <TouchableOpacity key={r.id}
                    style={[s.chip, rayonId === r.id && s.chipActive]}
                    onPress={() => setRayonId(r.id)}>
                    <Text style={[s.chipText, rayonId === r.id && s.chipTextActive]}>{r.nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors['rayonId'] ? <Text style={s.errorTxt}>{errors['rayonId']}</Text> : null}

              {/* Catégorie (filtrée par rayon) */}
              {selectedRayon && selectedRayon.categories.length > 0 && (
                <>
                  <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Catégorie</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
                    <TouchableOpacity
                      style={[s.chip, !categorieId && s.chipActive]}
                      onPress={() => setCategorieId(null)}>
                      <Text style={[s.chipText, !categorieId && s.chipTextActive]}>Toutes</Text>
                    </TouchableOpacity>
                    {selectedRayon.categories.map(c => (
                      <TouchableOpacity key={c.id}
                        style={[s.chip, categorieId === c.id && s.chipActive]}
                        onPress={() => setCategorieId(c.id)}>
                        <Text style={[s.chipText, categorieId === c.id && s.chipTextActive]}>{c.nom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Nom */}
              <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Nom *</Text>
              <View style={fieldStyle}>
                <TextInput style={inputStyle} value={nom} onChangeText={setNom}
                  placeholder="Titre du livre…" placeholderTextColor={Colors.textSoft} />
              </View>
              {errors['nom'] ? <Text style={s.errorTxt}>{errors['nom']}</Text> : null}

              {/* ISBN (si librairie) */}
              {isLibrairie && (
                <>
                  <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>ISBN</Text>
                  <View style={[s.field, isDark && s.fieldDark]}>
                    <TextInput style={inputStyle} value={isbn} onChangeText={setIsbn}
                      placeholder="9781234567890" placeholderTextColor={Colors.textSoft} keyboardType="numeric" />
                  </View>
                </>
              )}

              {/* Prix vente HT */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, isDark && s.labelDark]}>Prix vente HT (€) *</Text>
                  <View style={[s.field, isDark && s.fieldDark, errors['prixVenteHT'] && s.fieldError]}>
                    <TextInput style={inputStyle} value={prixVenteHT} onChangeText={setPrixVenteHT}
                      placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />
                  </View>
                  {errors['prixVenteHT'] ? <Text style={s.errorTxt}>{errors['prixVenteHT']}</Text> : null}
                  {selectedRayon ? (
                    <Text style={s.hint}>TVA {selectedRayon.tauxTVA}% → TTC {(parseFloat(prixVenteHT || '0') * (1 + selectedRayon.tauxTVA / 100)).toFixed(2)} €</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.label, isDark && s.labelDark]}>Prix achat HT (€)</Text>
                  <View style={[s.field, isDark && s.fieldDark]}>
                    <TextInput style={inputStyle} value={prixAchatHT} onChangeText={setPrixAchatHT}
                      placeholder="0.00" placeholderTextColor={Colors.textSoft} keyboardType="decimal-pad" />
                  </View>
                </View>
              </View>

              {/* Stock */}
              <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Stock initial</Text>
              <View style={[s.field, isDark && s.fieldDark]}>
                <TextInput style={inputStyle} value={stock} onChangeText={setStock}
                  placeholder="0" placeholderTextColor={Colors.textSoft} keyboardType="numeric" />
              </View>

              {/* Photo */}
              <Text style={[s.label, isDark && s.labelDark, { marginTop: 16 }]}>Photo de couverture</Text>
              <TouchableOpacity style={[s.photoBtn, isDark && s.photoBtnDark]} disabled>
                <Text style={s.photoBtnTxt}>📷 La photo se prend après création (depuis le catalogue)</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Bouton sauvegarder */}
        {!loadingMeta && (
          <View style={[s.footer, { paddingBottom: 20 + insets.bottom }, isDark && { backgroundColor: Dark.surface }]}>
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={saving ? [Colors.textSoft, Colors.textSoft] : Gradients.stock}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                {saving
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={s.saveBtnTxt}>Créer l'article</Text>}
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
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },

  content: { padding: 20 },
  label: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  labelDark: { color: 'rgba(255,255,255,0.6)' },
  field: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(196,132,122,0.15)', paddingHorizontal: 14, marginBottom: 4 },
  fieldDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' },
  fieldError: { borderColor: Colors.terra },
  input: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, paddingVertical: 13 },
  inputDark: { color: Colors.white },
  errorTxt: { fontFamily: Fonts.body, fontSize: 11, color: Colors.terra, marginTop: 2, marginBottom: 4 },
  hint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 4, fontStyle: 'italic' },

  row2: { flexDirection: 'row', marginTop: 16 },

  chipsRow: { flexDirection: 'row', flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { borderColor: Colors.terra, backgroundColor: Colors.roseLight },
  chipText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.textMid },
  chipTextActive: { color: Colors.terra },

  photoBtn: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(196,132,122,0.15)', borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  photoBtnDark: { backgroundColor: 'rgba(255,255,255,0.06)' },
  photoBtnTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSoft, textAlign: 'center' },

  footer: { paddingHorizontal: 20, paddingTop: 14, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  saveBtn: { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { fontFamily: Fonts.body, fontSize: 16, fontWeight: '700', color: Colors.white },
})
