interface SparklineProps {
  data: number[]
  positive: boolean
  width?: number
  height?: number
}

export function Sparkline({ data, positive, width = 80, height = 28 }: SparklineProps) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ])

  const path = pts
    .map((p, i) => {
      if (i === 0) return `M${p[0]},${p[1]}`
      const prev = pts[i - 1]!
      const cx = (prev[0] + p[0]) / 2
      return `C${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`
    })
    .join(' ')

  const fill = `${path} L${width},${height} L0,${height} Z`
  const color = positive ? '#5C8F6A' : '#E05252'
  const gradId = `sg-${positive ? 'pos' : 'neg'}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
