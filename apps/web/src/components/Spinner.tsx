interface Props {
  size?: 'sm' | 'md'
  color?: string
}

export function Spinner({ size = 'md', color = 'currentColor' }: Props) {
  const px = size === 'sm' ? 16 : 20
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
      aria-hidden
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
