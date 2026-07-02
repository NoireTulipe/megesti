import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import { useCustomFields, useCustomFieldsByRayon } from '@/features/reglages/hooks/useCustomFields'
import { useThesauri } from '@/features/reglages/hooks/useThesaurus'
import { buildValidateRule } from '@/lib/customFieldValidation'
import { DateField } from '@/components/DateInput'
import type { EntityType } from '@megesti/shared'
import type { CustomFieldDef } from '@/features/reglages/hooks/useCustomFields'
import styles from './CustomFieldsRenderer.module.css'

type Props = (
  | { entityType: EntityType; rayonId?: never }
  | { rayonId: string;        entityType?: never }
) & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register:           UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors:             FieldErrors<any>
  /** N'affiche que les champs de cette catégorie (injection dans une section fixe) */
  onlyCategory?:      string
  /** Exclut ces catégories (catch-all en bas de formulaire) */
  excludeCategories?: string[]
}

export function CustomFieldsRenderer({
  entityType, rayonId, register, errors, onlyCategory, excludeCategories,
}: Props) {
  const { data: entityChamps = [] } = useCustomFields(entityType ?? 'auteur', { enabled: !!entityType })
  const { data: rayonChamps  = [] } = useCustomFieldsByRayon(rayonId ?? '', { enabled: !!rayonId })
  const { data: thesauri = [] }     = useThesauri()

  const allChamps = entityType ? entityChamps : rayonChamps

  let champs = allChamps
  if (onlyCategory !== undefined) {
    champs = allChamps.filter((c) => c.category === onlyCategory)
  } else if (excludeCategories?.length) {
    champs = allChamps.filter((c) => !excludeCategories!.includes(c.category ?? ''))
  }

  if (champs.length === 0) return null

  // Mode injecté dans une section existante → pas de titre, juste la grille
  if (onlyCategory !== undefined) {
    return (
      <div className={styles.fieldsGrid}>
        {champs.map((c) => (
          <div key={c.id} className={styles.fieldWrap} style={{ gridColumn: c.halfWidth ? 'span 1' : 'span 2' }}>
            {renderFieldInner(c, register, errors, thesauri)}
          </div>
        ))}
      </div>
    )
  }

  // Mode rayon (pas de catégories fixes) → grille plate ou groupée
  if (rayonId) {
    const grouped = champs.reduce<Record<string, CustomFieldDef[]>>((acc, c) => {
      const key = c.category ?? '_'
      ;(acc[key] ??= []).push(c)
      return acc
    }, {})

    return (
      <>
        {Object.entries(grouped).map(([category, fields]) => (
          <div key={category} className={styles.section}>
            <p className={styles.sectionLabel}>{category !== '_' ? category : 'Autres'}</p>
            <div className={styles.fieldsGrid}>
              {fields.map((c) => (
                <div key={c.id} className={styles.fieldWrap} style={{ gridColumn: c.halfWidth ? 'span 1' : 'span 2' }}>
                  {renderFieldInner(c, register, errors, thesauri)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    )
  }

  // Mode catch-all entityType → grouper par catégorie
  const grouped = champs.reduce<Record<string, CustomFieldDef[]>>((acc, c) => {
    const key = c.category ?? '_'
    ;(acc[key] ??= []).push(c)
    return acc
  }, {})

  return (
    <>
      {Object.entries(grouped).map(([category, fields]) => (
        <div key={category} className={styles.section}>
          <p className={styles.sectionLabel}>{category !== '_' ? category : 'Autres'}</p>
          <div className={styles.fieldsGrid}>
            {fields.map((c) => (
              <div key={c.id} className={styles.fieldWrap} style={{ gridColumn: c.halfWidth ? 'span 1' : 'span 2' }}>
                {renderFieldInner(c, register, errors, thesauri)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function renderFieldInner(
  champ:    CustomFieldDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors:   FieldErrors<any>,
  thesauri: ReturnType<typeof useThesauri>['data'],
) {
  const fieldName = `custom_${champ.id}`
  const error     = errors[fieldName]
  const validate  = buildValidateRule(champ.validation)
  const rules     = {
    required: champ.required ? 'Requis' : false,
    ...(validate ? { validate } : {}),
  }
  const ph = champ.placeholder ?? undefined

  return (
    <>
      <label className={styles.label} htmlFor={fieldName}>
        {champ.labelFr}
        {champ.required && <span className={styles.req}> *</span>}
      </label>

      {champ.fieldType === 'text' && (
        <input id={fieldName} className={styles.input} placeholder={ph} {...register(fieldName, rules)} />
      )}
      {champ.fieldType === 'textarea' && (
        <textarea id={fieldName} className={styles.textarea} rows={3} placeholder={ph} {...register(fieldName, rules)} />
      )}
      {champ.fieldType === 'number' && (
        <input id={fieldName} className={styles.input} inputMode="decimal" placeholder={ph ?? '0'} {...register(fieldName, rules)} />
      )}
      {champ.fieldType === 'date' && (
        <DateField id={fieldName} className={styles.input} {...register(fieldName, rules)} />
      )}
      {champ.fieldType === 'boolean' && (
        <label className={styles.checkboxRow}>
          <input type="checkbox" className={styles.checkbox} {...register(fieldName)} />
          <span className={styles.checkboxLabel}>{champ.labelFr}</span>
        </label>
      )}
      {champ.fieldType === 'select' && champ.options && (
        <select id={fieldName} className={styles.select} {...register(fieldName, rules)}>
          <option value="">— Choisir —</option>
          {champ.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label.fr}</option>
          ))}
        </select>
      )}
      {champ.fieldType === 'thesaurus' && champ.thesaurusId && (() => {
        const thesaurus = thesauri?.find((t) => t.id === champ.thesaurusId)
        return (
          <select id={fieldName} className={styles.select} {...register(fieldName, rules)}>
            <option value="">— Choisir —</option>
            {thesaurus?.entries.filter((e) => !e.parentId).map((e) => (
              <option key={e.id} value={e.id}>{e.labelFr}</option>
            ))}
          </select>
        )
      })()}

      {error && <span className={styles.error}>{String(error.message)}</span>}
    </>
  )
}
