import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '@/store/authStore'
import { useDevStore } from '@/store/devStore'
import { Colors, Fonts, Radius, Spacing, Shadow } from '@/constants/theme'

export default function LoginScreen() {
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrapper}>
      <LinearGradient colors={[Colors.cream, Colors.roseLight, Colors.cream]} style={styles.bg} />

      <View style={styles.card}>
        {/* Logo / marque — appui long = menu dev */}
        <TouchableOpacity style={styles.brand} onLongPress={showDevMenu} delayLongPress={1500} activeOpacity={0.8}>
          <Text style={styles.brandIcon}>📚</Text>
          <Text style={styles.brandName}>MeGesti</Text>
          <Text style={styles.brandSub}>Maison d'édition</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vous@maisondedition.fr"
            placeholderTextColor={Colors.textSoft}
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
            placeholderTextColor={Colors.textSoft}
            secureTextEntry
            textContentType="password"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={pending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.ink, Colors.inkLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnBg}
            >
              <Text style={styles.btnText}>{pending ? 'Connexion…' : 'Se connecter'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>MeGesti — L'outil des maisons d'édition indépendantes</Text>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 28,
    paddingVertical: 36,
    ...Shadow.float,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  brandName: {
    fontFamily: Fonts.displayItalic,
    fontSize: 32,
    color: Colors.ink,
  },
  brandSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSoft,
    marginTop: 2,
  },
  form: {
    gap: 12,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(36,51,71,0.08)',
  },
  btn: {
    marginTop: 8,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnBg: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.terra,
    backgroundColor: Colors.terraLight,
    borderRadius: Radius.sm,
    padding: 10,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSoft,
    textAlign: 'center',
  },
})
