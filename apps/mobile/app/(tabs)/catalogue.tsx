import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, RefreshControl, Modal, Alert, ActivityIndicator,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { BarcodeIcon } from '@/components/BarcodeIcon'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalArticles, LocalArticle } from '@/hooks/useLocalArticles'
import { useLocalSession } from '@/hooks/useLocalSession'
import { useDevStore } from '@/store/devStore'
import { useScannerStore } from '@/store/scannerStore'
import { Colors, Dark, Fonts, Radius, Shadow, Gradients } from '@/constants/theme'
import { useAppTheme } from '@/hooks/useAppTheme'
// ── Écran principal ──────────────────────────────────────────────────

export default function StockScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [photoSheet, setPhotoSheet] = useState<LocalArticle | null>(null)
  const [uploading, setUploading] = useState(false)
  const { articles, pullFromServer, uploadImage } = useLocalArticles()
  const { session } = useLocalSession()
  const addLog = useDevStore(s => s.addLog)
  const pendingPhotoUri = useScannerStore(s => s.pendingPhotoUri)
  const setPendingPhotoUri = useScannerStore(s => s.setPendingPhotoUri)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { pullFromServer() }, [pullFromServer]))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await pullFromServer()
    setRefreshing(false)
  }, [pullFromServer])

  const exposedIds: string[] = session?.articles_exposes ? JSON.parse(session.articles_exposes) : []
  const displayed = articles.filter(a =>
    (exposedIds.length === 0 || exposedIds.includes(a.id)) &&
    (a.nom.toLowerCase().includes(search.toLowerCase()) || (a.isbn ?? '').includes(search))
  )

  // Caméra via expo-camera (évite le bug expo-image-picker + nouvelle archi RN)
  function openCameraCapture(article: LocalArticle) {
    addLog('info', `[photo] Ouverture caméra native — article=${article.id}`)
    setPhotoSheet(null)
    setUploading(true)
    setPendingPhotoUri(null)
    router.push(`/photo-capture?articleId=${article.id}`)
  }

  // Traitement du retour de photo-capture (via useFocusEffect plus bas)
  const articleRef = useRef<LocalArticle | null>(null)
  useFocusEffect(useCallback(() => {
    if (pendingPhotoUri && articleRef.current) {
      const uri = pendingPhotoUri
      const articleId = articleRef.current.id
      addLog('info', `[photo] Retour caméra — upload ${articleId} uri=${uri.substring(0, 50)}…`)
      setPendingPhotoUri(null)
      uploadImage(articleId, uri).finally(() => {
        setUploading(false)
        articleRef.current = null
      })
    }
  }, [pendingPhotoUri, uploadImage, setPendingPhotoUri, addLog]))

  async function pickImage(source: 'camera' | 'gallery', article: LocalArticle) {
    addLog('info', `[photo] pickImage déclenché — source=${source} article=${article.id}`)
    if (source === 'camera') {
      // Nouveau flux : navigation vers écran caméra natif
      articleRef.current = article
      openCameraCapture(article)
      return
    }
    // Galerie : conserve expo-image-picker
    setPhotoSheet(null)
    setUploading(true)
    try {
      addLog('info', '[photo] Lancement galerie…')
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })
      addLog('info', `[photo] Résultat galerie — canceled=${result.canceled} assets=${result.assets?.length ?? 0}`)
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri
        addLog('info', `[photo] URI galerie: ${uri.substring(0, 50)}…`)
        await uploadImage(article.id, uri)
      } else if (!result.canceled) {
        addLog('warn', '[photo] PAS D\'ASSET galerie — result.assets vide ou undefined')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={[styles.shell, isDark && { backgroundColor: Dark.bg }]}>
      <LinearGradient colors={isDark ? [Dark.bg, Dark.bg] : [Colors.sageLight, Colors.cream]} style={styles.bg} />

      {/* En-tête dégradé */}
      <LinearGradient
        colors={isDark ? Gradients.stockDark : Gradients.stock}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.heroGradient, { paddingTop: 48 + insets.top }]}>
        <Text style={styles.heroTitle}>Stock</Text>
        <Text style={styles.heroSub}>{displayed.length} articles</Text>

        {/* Recherche */}
        <View style={styles.heroSearch}>
          <Text style={styles.heroSearchIcon}>🔍</Text>
          <TextInput style={styles.heroSearchInput} value={search} onChangeText={setSearch}
            placeholder="Titre ou ISBN…" placeholderTextColor="rgba(255,255,255,0.4)" />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.sage} />}>

        {displayed.length === 0 && !refreshing ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyEmoji, isDark && { color: Dark.textSoft }]}>📦</Text>
            <Text style={[styles.emptyText, isDark && { color: Dark.textMid }]}>Aucun article</Text>
            <Text style={[styles.emptySub, isDark && { color: Dark.textSoft }]}>Synchronisez le stock depuis l'interface web.</Text>
          </View>
        ) : (
          displayed.map(a => (
            <TouchableOpacity key={a.id} style={[styles.card, isDark && { backgroundColor: Dark.surface, shadowColor: 'transparent', elevation: 0 }]} activeOpacity={0.7}
              onPress={() => setSelected(selected === a.id ? null : a.id)}>

              {/* Thumbnail ou placeholder */}
              <TouchableOpacity
                style={styles.cardImg}
                activeOpacity={0.8}
                onPress={(e) => { e.stopPropagation(); setPhotoSheet(a) }}>
                {a.thumb_app_url ? (
                  <Image
                    source={a.thumb_app_url}
                    style={styles.cardImgPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.cardImgEmpty}>
                    <Text style={styles.cardImgEmoji}>📚</Text>
                  </View>
                )}
                <View style={styles.cardImgCameraBadge}>
                  <Text style={styles.cardImgCameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>

              {/* Infos article */}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, isDark && { color: Dark.text }]} numberOfLines={2}>{a.nom}</Text>
                <Text style={[styles.cardMeta, isDark && { color: Dark.textSoft }]}>{a.rayon_nom ?? 'Sans rayon'}{a.categorie_nom ? ` · ${a.categorie_nom}` : ''}</Text>

                {selected === a.id && (
                  <View style={styles.cardDetail}>
                    <View style={styles.isbnRow}>
                      <Text style={styles.detailRow}>
                        ISBN : {a.isbn || 'Non renseigné'}
                      </Text>
                      <TouchableOpacity
                        style={styles.isbnScanBtn}
                        activeOpacity={0.7}
                        onPress={(e) => {
                          e.stopPropagation()
                          router.push(`/scanner?mode=attribution&articleId=${a.id}`)
                        }}>
                        <BarcodeIcon size={14} color={Colors.textSoft} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.detailRow}>Prix : {a.prix_vente_ht.toFixed(2)} €</Text>
                    <Text style={styles.detailRow}>TVA : {a.taux_tva}%</Text>
                  </View>
                )}
              </View>

              {/* Stock → navigation vers écran de mouvement */}
              <TouchableOpacity style={styles.cardRight}
                onPress={() => router.push(`/stock-mouvement?articleId=${a.id}`)}>
                <Text style={[styles.cardPrice, isDark && { color: Dark.text }]}>{a.prix_vente_ht.toFixed(2)} €</Text>
                <View style={[
                  styles.stockBadge,
                  a.stock_local <= 0 ? styles.stockBadgeRupture : a.stock_local <= (a.stock_alerte || 3) ? styles.stockBadgeLow : styles.stockBadgeOk,
                ]}>
                  <Text style={[
                    styles.stockBadgeText,
                    a.stock_local <= 0 ? styles.stockBadgeTextRupture : a.stock_local <= (a.stock_alerte || 3) ? styles.stockBadgeTextLow : styles.stockBadgeTextOk,
                  ]}>
                    {a.stock_local}
                  </Text>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Indicateur upload */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator color={Colors.rose} size="large" />
            <Text style={styles.uploadText}>Envoi de la photo…</Text>
          </View>
        </View>
      )}

      {/* Sheet choix photo */}
      <Modal visible={!!photoSheet} transparent animationType="slide" onRequestClose={() => setPhotoSheet(null)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setPhotoSheet(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Photo</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>{photoSheet?.nom}</Text>
            </View>

            {/* Preview de la photo actuelle */}
            <View style={styles.sheetPreview}>
              {photoSheet?.thumb_app_url ? (
                <Image source={photoSheet.thumb_app_url} style={styles.sheetPreviewImg}
                  contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={styles.sheetPreviewEmpty}>
                  <Text style={styles.sheetPreviewEmoji}>📷</Text>
                  <Text style={styles.sheetPreviewHint}>Aucune photo</Text>
                </View>
              )}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetBtn} activeOpacity={0.8}
                onPress={() => photoSheet && pickImage('camera', photoSheet)}>
                <LinearGradient colors={Gradients.caisse} style={styles.sheetBtnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.sheetBtnEmoji}>📷</Text>
                  <Text style={styles.sheetBtnText}>Prendre une photo</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetBtn} activeOpacity={0.8}
                onPress={() => photoSheet && pickImage('gallery', photoSheet)}>
                <View style={styles.sheetBtnSecondary}>
                  <Text style={styles.sheetBtnEmoji}>🖼</Text>
                  <Text style={styles.sheetBtnTextSecondary}>Choisir dans la galerie</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Colors.cream },
  bg: { ...StyleSheet.absoluteFillObject },
  // Hero (même style que la caisse)
  heroGradient: { paddingHorizontal: 20, paddingBottom: 20, marginBottom: 16 },
  heroTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },
  heroSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3, marginBottom: 14 },

  heroSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroSearchIcon: { fontSize: 15, marginRight: 6 },
  heroSearchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.white, paddingVertical: 10 },
  list: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontFamily: Fonts.displayItalic, fontSize: 18, color: Colors.textMid, fontStyle: 'italic' },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },


  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, marginBottom: 8, ...Shadow.card, alignItems: 'center' },

  cardImg: { width: 52, height: 70, borderRadius: Radius.sm, marginRight: 12, overflow: 'visible' },
  cardImgPhoto: { width: 52, height: 70, borderRadius: Radius.sm },
  cardImgEmpty: { width: 52, height: 70, borderRadius: Radius.sm, backgroundColor: Colors.creamMid, justifyContent: 'center', alignItems: 'center' },
  cardImgEmoji: { fontSize: 24 },
  cardImgCameraBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: Colors.rose, borderRadius: Radius.full, width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.white,
  },
  cardImgCameraIcon: { fontSize: 10 },

  cardBody: { flex: 1 },
  cardTitle: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.text },
  cardMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginTop: 3 },
  cardDetail: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.cream },
  detailRow: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMid, marginBottom: 3 },
  isbnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  isbnScanBtn: {
    width: 28, height: 28, borderRadius: Radius.sm,
    backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center',
    marginBottom: 3, marginLeft: 8,
  },
  isbnScanIcon: { fontSize: 14 },

  cardRight: { alignItems: 'flex-end', marginLeft: 10 },
  cardPrice: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.sage },
  stockBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, minWidth: 36, alignItems: 'center' },
  stockBadgeOk: { backgroundColor: Colors.sageLight },
  stockBadgeLow: { backgroundColor: Colors.goldLight },
  stockBadgeRupture: { backgroundColor: Colors.terraLight },
  stockBadgeText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '700' },
  stockBadgeTextOk: { color: Colors.sage },
  stockBadgeTextLow: { color: Colors.gold },
  stockBadgeTextRupture: { color: Colors.terra },
  stockInput: {
    marginTop: 6, width: 48, height: 30, borderRadius: Radius.full,
    backgroundColor: Colors.cream, borderWidth: 1.5, borderColor: Colors.sage,
    fontFamily: Fonts.body, fontSize: 11, fontWeight: '700', color: Colors.sage,
    textAlign: 'center', paddingVertical: 0, paddingHorizontal: 4,
  },

  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  uploadCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, alignItems: 'center', gap: 16, ...Shadow.float },
  uploadText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMid },

  sheetOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.creamDark, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.rose, fontStyle: 'italic' },
  sheetSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft, marginTop: 2 },
  sheetPreview: { marginHorizontal: 20, marginBottom: 20, height: 180, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.creamMid },
  sheetPreviewImg: { width: '100%', height: '100%' },
  sheetPreviewEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  sheetPreviewEmoji: { fontSize: 40 },
  sheetPreviewHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSoft },
  sheetActions: { paddingHorizontal: 20, gap: 10 },
  sheetBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  sheetBtnBg: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 10 },
  sheetBtnSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 10, backgroundColor: Colors.cream, borderRadius: Radius.md },
  sheetBtnEmoji: { fontSize: 20 },
  sheetBtnText: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },
  sheetBtnTextSecondary: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '600', color: Colors.textMid },
})
