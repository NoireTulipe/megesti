import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { Colors, Fonts, Radius } from '@/constants/theme'

const MEGESTI_LOGO = require('../assets/images/logo.png')

// ── Bulle flottante ──────────────────────────────────────────────────────

function Blob({ size, color, left, top, drift, duration, delay }: {
  size: number; color: string; left: string; top: string
  drift: number; duration: number; delay: number
}) {
  const dx = useRef(new Animated.Value(0)).current
  const dy = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const appear = Animated.timing(fade, { toValue: 1, duration: 2000, useNativeDriver: true, delay })
    const float = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dx, { toValue: drift, duration, useNativeDriver: true }),
          Animated.timing(dx, { toValue: -drift, duration: duration * 0.7, useNativeDriver: true }),
          Animated.timing(dx, { toValue: 0, duration: duration * 0.5, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dy, { toValue: -drift * 0.7, duration: duration * 0.8, useNativeDriver: true }),
          Animated.timing(dy, { toValue: drift * 0.6, duration: duration * 0.6, useNativeDriver: true }),
          Animated.timing(dy, { toValue: 0, duration: duration * 0.7, useNativeDriver: true }),
        ]),
      ]),
    )
    appear.start(() => float.start())
    return () => { appear.stop(); float.stop() }
  }, [])

  return (
    <Animated.View
      style={{
        position: 'absolute', left: left as any, top: top as any,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: fade,
        transform: [{ translateX: dx }, { translateY: dy }],
      }}
    />
  )
}

// ── Écran ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const login = useAuthStore(s => s.login)
  const showDevMenu = useDevStore(s => s.showDevMenu)

  async function handleLogin() {
    setError('')
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.')
      return
    }
    setPending(true)
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)')
    } catch (e: any) {
      setError(e?.message === 'Identifiants invalides'
        ? 'Email ou mot de passe incorrect.'
        : 'Impossible de se connecter. Vérifiez votre connexion.')
    } finally {
      setPending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}>

      {/* Fond nuit profonde */}
      <LinearGradient
        colors={['#1E1A2E', '#1A2744', '#101D33']}
        style={styles.bg}
      />

      {/* Halos fixes décoratifs */}
      <View style={[styles.halo, { width: 280, height: 280, borderRadius: 140, top: '-10%', right: '-15%', backgroundColor: 'rgba(196,144,124,0.10)' }]} />
      <View style={[styles.halo, { width: 180, height: 180, borderRadius: 90, bottom: '25%', left: '-10%', backgroundColor: 'rgba(201,147,58,0.08)' }]} />

      {/* Bulles animées — réparties sur tout l'écran */}
      <Blob size={120} color="rgba(196,144,124,0.20)" left="70%" top="12%"  drift={27} duration={9000}  delay={200} />
      <Blob size={90}  color="rgba(201,147,58,0.16)" left="15%" top="55%"  drift={22} duration={7500}  delay={600} />
      <Blob size={105} color="rgba(139,123,171,0.17)" left="60%" top="72%"  drift={25} duration={8500}  delay={400} />
      <Blob size={80}  color="rgba(196,144,124,0.15)" left="25%" top="22%"  drift={20} duration={7000}  delay={900} />
      <Blob size={95}  color="rgba(201,147,58,0.13)" left="80%" top="42%"  drift={23} duration={8000}  delay={700} />

      {/* Contenu */}
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>

        {/* Logo */}
        <TouchableOpacity onLongPress={showDevMenu} delayLongPress={1500} activeOpacity={0.9}>
          <Image
            source={MEGESTI_LOGO}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        <Text style={styles.tagline}>L'outil des maisons d'édition indépendantes</Text>

        {/* Carte formulaire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connectez-vous</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vous@maison-edition.fr"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry
            textContentType="password"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={pending}
            activeOpacity={0.85}>
            <LinearGradient
              colors={['#C4847A', '#B07060']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnBg}>
              <Text style={styles.btnText}>
                {pending ? 'Connexion…' : 'Se connecter'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#1E1A2E' },
  bg:     { ...StyleSheet.absoluteFillObject },
  halo:   { position: 'absolute' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },

  logo: { width: 360, height: 108, marginBottom: 4 },

  tagline: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
  },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 10,
  },

  cardTitle: {
    fontFamily: Fonts.displayItalic,
    fontSize: 20,
    color: Colors.white,
    fontStyle: 'italic',
    marginBottom: 6,
    textAlign: 'center',
  },

  label: {
    fontFamily: Fonts.body,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },

  input: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  btn: { marginTop: 10, borderRadius: Radius.md, overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  btnBg: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontFamily: Fonts.body, fontSize: 15, fontWeight: '700', color: Colors.white },

  error: {
    fontFamily: Fonts.body, fontSize: 12, color: '#F4A0A0',
    backgroundColor: 'rgba(200,80,80,0.15)', borderRadius: Radius.sm,
    padding: 10, overflow: 'hidden', textAlign: 'center',
  },
})
