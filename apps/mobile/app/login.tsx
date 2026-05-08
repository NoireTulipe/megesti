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

// ── Bulles flottantes (mouvement lent, opacité constante) ─────────────

function AnimatedBlob({ size, color, xRange, yRange, duration, delay, opacity }: {
  size: number; color: string; xRange: [number, number]; yRange: [number, number]
  duration: number; delay: number; opacity: number
}) {
  const posX = useRef(new Animated.Value(xRange[0])).current
  const posY = useRef(new Animated.Value(yRange[0])).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const appear = Animated.timing(fade, { toValue: opacity, duration: 2000, useNativeDriver: true, delay })
    const float = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(posX, { toValue: xRange[1], duration, useNativeDriver: true }),
          Animated.timing(posX, { toValue: xRange[0], duration: duration * 0.8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(posY, { toValue: yRange[1], duration: duration * 1.2, useNativeDriver: true }),
          Animated.timing(posY, { toValue: yRange[0], duration: duration, useNativeDriver: true }),
        ]),
      ]),
    )
    appear.start(() => float.start())
    return () => { appear.stop(); float.stop() }
  }, [])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: fade,
        transform: [{ translateX: posX }, { translateY: posY }],
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

      {/* Fond nuit profonde (comme le web) */}
      <LinearGradient
        colors={['#1E1A2E', '#1A2744', '#101D33']}
        style={styles.bg}
      />

      {/* Halos fixes — subtils */}
      <View style={[styles.halo, { width: 300, height: 300, borderRadius: 150, top: -80, right: -80, backgroundColor: 'rgba(196,144,124,0.08)' }]} />
      <View style={[styles.halo, { width: 200, height: 200, borderRadius: 100, bottom: '30%', left: -60, backgroundColor: 'rgba(201,147,58,0.06)' }]} />

      {/* Bulles animées — flottement lent, tailles modestes */}
      <AnimatedBlob size={100} color="rgba(196,144,124,0.14)" xRange={[-20, 40]} yRange={[-30, 50]}  duration={10000} delay={300}  opacity={0.14} />
      <AnimatedBlob size={80}  color="rgba(201,147,58,0.11)" xRange={[30, -20]} yRange={[20, -40]}  duration={8000}  delay={700}  opacity={0.11} />
      <AnimatedBlob size={110} color="rgba(139,123,171,0.10)" xRange={[-30, 30]} yRange={[50, -20]} duration={9000}  delay={500}  opacity={0.10} />
      <AnimatedBlob size={70}  color="rgba(196,144,124,0.12)" xRange={[20, -30]} yRange={[-50, 30]} duration={7000}  delay={1000} opacity={0.12} />

      {/* Contenu */}
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>

        {/* Logo — grand et fier */}
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

  logo: {
    width: 360,
    height: 108,
    marginBottom: 4,
  },

  tagline: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Carte
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

  btn: {
    marginTop: 10,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  btnDisabled: { opacity: 0.5 },
  btnBg: { paddingVertical: 16, alignItems: 'center' },
  btnText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#F4A0A0',
    backgroundColor: 'rgba(200,80,80,0.15)',
    borderRadius: Radius.sm,
    padding: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
})
