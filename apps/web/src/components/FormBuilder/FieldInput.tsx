import type { BuilderField } from './types'
import styles from './FieldInput.module.css'

export function FieldInput({ field }: { field: BuilderField }) {
  if (field.fieldType === 'textarea') {
    return (
      <textarea
        className={styles.input}
        placeholder={`${field.labelFr}…`}
        rows={3}
        readOnly
        tabIndex={-1}
      />
    )
  }

  if (field.fieldType === 'boolean') {
    return (
      <label className={styles.checkRow}>
        <input type="checkbox" disabled className={styles.check} />
        <span className={styles.checkLabel}>{field.labelFr}</span>
      </label>
    )
  }

  if (field.fieldType === 'select') {
    return (
      <select className={`${styles.input} ${styles.select}`} disabled tabIndex={-1}>
        <option>Choisir…</option>
        {field.options?.map((o, i) => (
          <option key={i} value={o.value}>{o.label?.fr ?? o.value}</option>
        ))}
      </select>
    )
  }

  if (field.fieldType === 'thesaurus') {
    return (
      <select className={`${styles.input} ${styles.select}`} disabled tabIndex={-1}>
        <option>Sélectionner…</option>
      </select>
    )
  }

  const typeMap: Record<string, string> = { text: 'text', number: 'number', date: 'date' }
  return (
    <input
      type={typeMap[field.fieldType] ?? 'text'}
      className={styles.input}
      placeholder={field.fieldType === 'number' ? '0' : `${field.labelFr}…`}
      readOnly
      tabIndex={-1}
    />
  )
}
