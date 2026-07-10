import { useEffect, useRef } from 'react'
import { Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native'
import type { DimensionValue } from 'react-native'
import Animated, { ZoomIn, FadeIn, FadeOut, BounceIn } from 'react-native-reanimated'
import { Colors, Fonts, Radius } from '@/constants/theme'

interface SaleSuccessOverlayProps {
  amount: number
  /** Texte secondaire optionnel (ex. « À rendre : 2,50 € ») */
  hint?: string | null
  /** false = confirmation fixe, sans rebond ni étincelles (réglage utilisateur) */
  animated?: boolean
  onDone: () => void
}

const SPARKLES: { emoji: string; top: DimensionValue; left: DimensionValue; delay: number }[] = [
  { emoji: '✨', top: '32%', left: '22%', delay: 150 },
  { emoji: '✨', top: '28%', left: '72%', delay: 280 },
  { emoji: '🎉', top: '58%', left: '16%', delay: 220 },
  { emoji: '✨', top: '62%', left: '78%', delay: 350 },
]

/**
 * Flash de succès après une vente : coche animée (ou fixe selon le réglage),
 * montant, vibration. Reste affiché 2 s pleines après l'entrée, puis disparaît.
 * Un tap ferme immédiatement (le vendeur est pressé).
 */
export function SaleSuccessOverlay({ amount, hint, animated = true, onDone }: SaleSuccessOverlayProps) {
  const doneRef = useRef(false)
  function dismiss() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    Vibration.vibrate(60)
    // Entrée animée ≈ 0,5 s + 2 s d'affichage fixe avant la disparition.
    const t = setTimeout(dismiss, animated ? 2500 : 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <Animated.View
      style={s.overlay}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(200)}>
      <TouchableOpacity style={s.touch} activeOpacity={1} onPress={dismiss}>
        {animated && SPARKLES.map((sp, i) => (
          <Animated.Text
            key={i}
            entering={ZoomIn.delay(sp.delay).springify()}
            style={[s.sparkle, { top: sp.top, left: sp.left }]}>
            {sp.emoji}
          </Animated.Text>
        ))}
        <Animated.View style={s.card}
          entering={animated ? ZoomIn.springify().damping(12) : FadeIn.duration(150)}>
          <Animated.View style={s.checkCircle}
            entering={animated ? BounceIn.delay(80) : FadeIn.duration(150)}>
            <Text style={s.check}>✓</Text>
          </Animated.View>
          <Text style={s.amount}>{amount.toFixed(2)} €</Text>
          <Text style={s.label}>Vente enregistrée</Text>
          {hint ? <Text style={s.hint}>{hint}</Text> : null}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,33,24,0.45)',
    zIndex: 100, elevation: 100,
  },
  touch: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sparkle: { position: 'absolute', fontSize: 28 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    paddingVertical: 28, paddingHorizontal: 40, alignItems: 'center',
    shadowColor: Colors.text, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 12,
  },
  checkCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.sage,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  check: { fontSize: 34, color: Colors.white, fontWeight: '700', lineHeight: 40 },
  amount: { fontFamily: Fonts.displayItalic, fontSize: 34, fontStyle: 'italic', color: Colors.text },
  label:  { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600', color: Colors.textSoft, marginTop: 4 },
  hint:   { fontFamily: Fonts.body, fontSize: 15, fontWeight: '800', color: Colors.gold, marginTop: 10 },
})
