import styles from './SearchInput.module.css'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
  className?: string
}

function avecLoupe(p: string) {
  return p.startsWith('🔍') ? p : `🔍  ${p}`
}

export function SearchInput({ value, onChange, onClear, placeholder = '🔍  Rechercher…', className }: SearchInputProps) {
  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <input
        className={styles.input}
        type="text"
        placeholder={avecLoupe(placeholder)}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className={styles.clear} onClick={onClear} aria-label="Effacer la recherche">
          ✕
        </button>
      )}
    </div>
  )
}
