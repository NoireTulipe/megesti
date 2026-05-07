import { View } from 'react-native'

interface Props {
  size?: number
  color?: string
}

export function BarcodeIcon({ size = 22, color = '#fff' }: Props) {
  const bars = [2, 1, 3, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2]
  const h = size * 1.2
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, height: h }}>
      {bars.map((w, i) => (
        <View
          key={i}
          style={{ width: w * 1.5, height: h, backgroundColor: color, borderRadius: w * 0.5 }}
        />
      ))}
    </View>
  )
}
