import { useRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useScannerStore } from '@/store/scannerStore'
import { useDevStore } from '@/store/devStore'
import { Colors, Fonts, Radius } from '@/constants/theme'

export default function PhotoCaptureScreen() {
  const insets = useSafeAreaInsets()
  const cameraRef = useRef<CameraView>(null)
  const [perm, requestPerm] = useCameraPermissions()
  const [permDenied, setPermDenied] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const setPendingPhotoUri = useScannerStore(s => s.setPendingPhotoUri)
  const addLog = useDevStore(s => s.addLog)
  const hasRequested = useRef(false)

  useFocusEffect(useCallback(() => {
    if (!hasRequested.current && perm && !perm.granted && perm.canAskAgain) {
      hasRequested.current = true
      requestPerm()
    }
    if (perm && !perm.granted && !perm.canAskAgain) {
      setPermDenied(true)
    }
  }, [perm]))

  async function capture() {
    if (!cameraRef.current || capturing) return
    setCapturing(true)
    addLog('info', '[photo] Capture déclenchée…')
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      addLog('info', `[photo] Photo capturée: ${photo?.uri?.substring(0, 50)}…`)
      if (photo?.uri) {
        setPendingPhotoUri(photo.uri)
        router.back()
      }
    } catch (e: any) {
      addLog('error', `[photo] Erreur capture: ${e?.message}`)
    } finally {
      setCapturing(false)
    }
  }

  if (permDenied) {
    return (
      <View style={[styles.shell, { backgroundColor: Colors.ink }]}>
        <View style={styles.permDenied}>
          <Text style={styles.permDeniedEmoji}>📷</Text>
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
      {perm?.granted && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.headerBackBtn} activeOpacity={0.7}
          onPress={() => router.back()}>
          <Text style={styles.headerBackTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo article</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bouton capture */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {capturing ? (
          <View style={styles.capturingBadge}>
            <ActivityIndicator color={Colors.white} size="small" />
            <Text style={styles.capturingText}>Capture…</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureBtn} activeOpacity={0.8} onPress={capture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const CAPTURE_SIZE = 72

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#000' },

  // Permission refusée
  permDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  permDeniedEmoji: { fontSize: 48 },
  permDeniedTitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: Colors.white, fontStyle: 'italic' },
  permDeniedSub: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  backBtnText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '600', color: Colors.white },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerBackBtn: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  headerBackTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  headerTitle: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '600', color: Colors.white },

  // Footer / capture
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: CAPTURE_SIZE, height: CAPTURE_SIZE, borderRadius: CAPTURE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: Colors.white,
  },
  captureBtnInner: {
    width: CAPTURE_SIZE - 16, height: CAPTURE_SIZE - 16,
    borderRadius: (CAPTURE_SIZE - 16) / 2,
    backgroundColor: Colors.white,
  },
  capturingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  capturingText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.white },
})
