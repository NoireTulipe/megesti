import styles from './DateInput.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  required?: boolean
  className?: string
  id?: string
}

/** Champ date uniforme (ISO YYYY-MM-DD), styles cohérents dans toute l'app. */
export function DateInput({ value, onChange, min, max, required, className, id }: Props) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      required={required}
      className={`${styles.input} ${className ?? ''}`}
    />
  )
}

/** Formate une date ISO en "DD/MM/YYYY" pour l'affichage. */
export function fmtDateFR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}
