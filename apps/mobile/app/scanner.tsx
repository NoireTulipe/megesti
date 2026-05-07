import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Vibration, Platform,
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { api } from '@/lib/api'
import { findByIsbn, LocalArticle } from '@/hooks/useLocalArticles'
import { useScannerStore } from '@/store/scannerStore'
import { BarcodeIcon } from '@/components/BarcodeIcon'
import { Colors, Fonts, Radius } from '@/constants/theme'

// ── Scanner ──────────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    sessionId: string; encaissementDirect: string
    articleId: string; mode: string
  }>()

  const mode = (params.mode as string) ?? 'vente'
  const addItem = useScannerStore(s => s.addItem)
  const scannedCount = useScannerStore(s => s.items.length)

  // Permissions caméra
  const [perm, requestPerm] = useCameraPermissions()
  const [permDenied, setPermDenied] = useState(false)
  useFocusEffect(useCallback(() => {
    if (perm && !perm.granted && perm.canAskAgain) requestPerm()
    if (perm && !perm.granted && !perm.canAskAgain) setPermDenied(true)
  }, [perm]))

  // Scan
  const [scanned, setScanned] = useState(false)
  const [found, setFound] = useState<LocalArticle | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const notFoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Gestion scan ──

  async function handleBarcode(result: BarcodeScanningResult) {
    if (scanned || showSheet) return
    const isbn = result.data.trim()
    setScanned(true)

    // Mode attribution
    if (mode === 'attribution' && params.articleId) {
      api.patch(`/articles/${params.articleId}`, { isbn }).finally(() => router.back())
      return
    }

    // Mode vente : chercher l'article
    const article = await findByIsbn(isbn)
    if (article) {
      if (Platform.OS !== 'web') Vibration.vibrate(50)
      setFound(article)
      setShowSheet(true)
    } else {
      setNotFound(isbn)
      if (notFoundTimer.current) clearTimeout(notFoundTimer.current)
      notFoundTimer.current = setTimeout(() => {
        setScanned(false)
        setNotFound(null)
      }, 2000)
    }
  }

  // ── Actions ──

  function cancel() {
    setShowSheet(false)
    setFound(null)
    setScanned(false)
  }

  function addAndContinue() {
    if (found) {
      addItem({ articleId: found.id, nom: found.nom, prixUnitaireHT: found.prix_vente_ht })
    }
    setShowSheet(false)
    setFound(null)
    setScanned(false)
  }

  function addAndFinish() {
    if (found) {
      addItem({ articleId: found.id, nom: found.nom, prixUnitaireHT: found.prix_vente_ht })
    }
    router.back()
  }

  // ── Rendu ───────────────────────────────────────────────────────

  if (permDenied) {
    return (
      <View style={[styles.shell, { backgroundColor: Colors.ink }]}>
        <LinearGradient colors={[Colors.ink, Colors.inkDeep]} style={styles.bg} />
        <View style={styles.permDenied}>
          <BarcodeIcon size={40} color="rgba(255,255,255,0.4)" />
          <Text style={styles.permDeniedTitle}>Accès à la caméra refusé</Text>
          <Text style={styles.permDeniedSub}>
            Activez l'accès dans les paramètres de votre téléphone.
          </Text>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8}
            onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.shell}>
      {/* Caméra plein écran */}
      {perm?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={scanned || showSheet ? undefined : handleBarcode}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Cadre de scan */}
        <View style={styles.scanFrame}>
          <View style={[styles.scanCorner, styles.scanCornerTL]} />
          <View style={[styles.scanCorner, styles.scanCornerTR]} />
          <View style={[styles.scanCorner, styles.scanCornerBL]} />
          <View style={[styles.scanCorner, styles.scanCornerBR]} />
        </View>

        {/* ISBN non trouvé */}
        {notFound && (
          <View style={styles.notFoundBanner}>
            <Text style={styles.notFoundIcon}>⚠️</Text>
            <Text style={styles.notFoundText}>ISBN inconnu : {notFound}</Text>
          </View>
        )}

        {/* Texte d'aide */}
        {!scanned && !notFound && mode === 'vente' && (
          <Text style={styles.hint}>Placez un code-barres dans le cadre</Text>
        )}
        {!scanned && !notFound && mode === 'attribution' && (
          <Text style={styles.hint}>Scannez le code-barres à associer</Text>
        )}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.headerBackBtn} activeOpacity={0.7}
          onPress={() => router.back()}>
          <Text style={styles.headerBackTxt}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <BarcodeIcon size={18} color={Colors.white} />
          <Text style={styles.headerTitle}>
            {mode === 'attribution' ? ' Associer un ISBN' : ` Scanner${scannedCount > 0 ? ` (${scannedCount})` : ''}`}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Barre de résumé en bas */}
      {mode === 'vente' && scannedCount > 0 && !showSheet && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.bottomBarText}>
            {scannedCount} article{scannedCount > 1 ? 's' : ''} dans le panier
          </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.bottomBarLink}>Voir le panier →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom sheet article trouvé ── */}
      <Modal visible={showSheet} transparent animationType="slide"
        onRequestClose={cancel}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1}
          onPress={cancel}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />

            {found && (
              <>
                {/* Infos produit */}
                <View style={styles.sheetProduct}>
                  {found.thumb_app_url ? (
                    <Image source={found.thumb_app_url} style={styles.sheetImg}
                      contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={styles.sheetImgPlaceholder}>
                      <Text style={styles.sheetImgEmoji}>📚</Text>
                    </View>
                  )}
                  <View style={styles.sheetProductInfo}>
                    <Text style={styles.sheetProductName} numberOfLines={2}>{found.nom}</Text>
                    <Text style={styles.sheetProductMeta}>
                      {found.isbn ? `ISBN ${found.isbn}` : 'Sans ISBN'} · {found.stock_local} en stock
                    </Text>
                    <Text style={styles.sheetProductPrice}>{found.prix_vente_ht.toFixed(2)} €</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.sheetBtnCancel}
                    activeOpacity={0.7}
                    onPress={cancel}>
                    <Text style={styles.sheetBtnCancelText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetBtnContinue}
                    activeOpacity={0.85}
                    onPress={addAndContinue}>
                    <LinearGradient colors={[Colors.ink, Colors.inkLight]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.sheetBtnGradient}>
                      <Text style={styles.sheetBtnGradientText}>Ajouter et{'\n'}continuer</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetBtnFinish}
                    activeOpacity={0.85}
                    onPress={addAndFinish}>
                    <LinearGradient colors={[Colors.sage, '#3A7D63']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.sheetBtnGradient}>
                      <Text style={styles.sheetBtnGradientText}>Ajouter et{'\n'}terminer</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────

const FRAME_W = 260
const FRAME_H = 180

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject },

  // Permission
  permDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  permDeniedTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic', marginTop: 8 },
  permDeniedSub: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  backBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.white },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: FRAME_W, height: FRAME_H, position: 'relative' },
  scanCorner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.rose, borderWidth: 3 },
  scanCornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },

  hint: {
    position: 'absolute', bottom: 160,
    fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 10, overflow: 'hidden',
  },
  notFoundBanner: {
    position: 'absolute', bottom: 140,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(217,119,90,0.9)', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  notFoundIcon: { fontSize: 16 },
  notFoundText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.white },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerBackBtn: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  headerBackTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '600', color: Colors.white },

  // Barre du bas
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20, paddingTop: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  bottomBarText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700', color: Colors.white },
  bottomBarLink: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600', color: Colors.rose },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 20 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.creamDark, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  sheetProduct: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  sheetImg: { width: 80, height: 110, borderRadius: Radius.md, backgroundColor: Colors.cream },
  sheetImgPlaceholder: { width: 80, height: 110, borderRadius: Radius.md, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center' },
  sheetImgEmoji: { fontSize: 32 },
  sheetProductInfo: { flex: 1, justifyContent: 'center' },
  sheetProductName: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sheetProductMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSoft, marginBottom: 6 },
  sheetProductPrice: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.ink, fontStyle: 'italic' },

  sheetActions: { flexDirection: 'row', gap: 8 },
  sheetBtnCancel: {
    flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, backgroundColor: Colors.cream,
  },
  sheetBtnCancelText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.textMid },
  sheetBtnContinue: { flex: 1.2, borderRadius: Radius.md, overflow: 'hidden' },
  sheetBtnFinish: { flex: 1.2, borderRadius: Radius.md, overflow: 'hidden' },
  sheetBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  sheetBtnGradientText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', color: Colors.white, textAlign: 'center', lineHeight: 16 },
})
