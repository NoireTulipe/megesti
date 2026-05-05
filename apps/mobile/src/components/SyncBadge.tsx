import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { syncEngine, SyncStatus } from '@/lib/sync'
import { Colors, Fonts, Radius } from '@/constants/theme'

export function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.status)
  const [count, setCount] = useState(syncEngine.pendingCount)
  const [pulse] = useState(() => new Animated.Value(1))

  useEffect(() => {
    return syncEngine.subscribe((s, c) => {
      setStatus(s)
      setCount(c)
      if (s === 'syncing') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
        ).start()
      } else {
        pulse.setValue(1)
      }
    })
  }, [])

  if (status === 'online' && count === 0) {
    return (
      <View style={[styles.badge, styles.online]}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.textOnline}>Synchronisé</Text>
      </View>
    )
  }

  if (status === 'syncing') {
    return (
      <Animated.View style={[styles.badge, styles.syncing, { opacity: pulse }]}>
        <Text style={styles.dot}>⟳</Text>
        <Text style={styles.textSyncing}>{count} en cours…</Text>
      </Animated.View>
    )
  }

  return (
    <View style={[styles.badge, styles.offline]}>
      <Text style={[styles.dot, { color: Colors.gold }]}>●</Text>
      <Text style={styles.textOffline}>{count} en attente</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    marginTop: 12,
  },
  online: { backgroundColor: Colors.sageLight },
  syncing: { backgroundColor: Colors.inkFaint },
  offline: { backgroundColor: Colors.goldLight },
  dot: { fontSize: 8, color: Colors.sage },
  textOnline: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.sage },
  textSyncing: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.ink },
  textOffline: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600', color: Colors.gold },
})
