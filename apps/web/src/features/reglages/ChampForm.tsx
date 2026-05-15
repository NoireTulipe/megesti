import { generateUUID } from '@/lib/utils'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCustomField } from './hooks/useCustomFields'
import { useThesauri } from './hooks/useThesaurus'
import { FIELD_TYPES } from '@megesti/shared'
import type { EntityType } from '@megesti/shared'
import styles from './ChampForm.module.css'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text:      'Texte court',  textarea:  'Texte long',
  number:    'Nombre',       date:      'Date',
  boolean:   'Case Ã  cocher', select:   'Liste dÃ©roulante',
  thesaurus: 'ThÃ©saurus',
}

const COMMON_CATEGORIES = ['Contact', 'Bibliographie', 'Commercial', 'Notes']

const schema = z.object({
  labelFr:     z.string().min(1, 'Requis'),
  fieldType:   z.enum(FIELD_TYPES),
  required:    z.boolean().default(false),
  category:    z.string().optional(),
  thesaurusId: z.string().optional(),
})

type FormValues = z.infer<typeof schema> & { labelEn?: string }

interface Props {
  entityType: EntityType
  onClose:    () => void
}

export function ChampForm({ entityType, onClose }: Props) {
  const createChamp = useCreateCustomField()
  const { data: thesauri = [] } = useThesauri()

  const [options, setOptions]     = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fieldType: 'text', required: false },
  })

  const fieldType = watch('fieldType')

  function addOption() {
    const val = newOption.trim()
    if (val && !options.includes(val)) setOptions((p) => [...p, val])
    setNewOption('')
  }

  async function onSubmit(values: FormValues) {
    await createChamp.mutateAsync({
      id:          generateUUID(),
      entityType,
      label:       { fr: values.labelFr },
      fieldType:   values.fieldType,
      position:    0,
      required:    values.required,
      category:    values.category?.trim() || null,
      thesaurusId: values.fieldType === 'thesaurus' ? (values.thesaurusId ?? null) : null,
      options:     values.fieldType === 'select'
        ? options.map((o, i) => ({ value: `opt_${i}`, label: { fr: o } }))
        : null,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>LibellÃ© <span className={styles.req}>*</span></label>
          <input className={`${styles.input} ${errors.labelFr ? styles.inputError : ''}`} {...register('labelFr')} placeholder="Ex : NumÃ©ro de tÃ©lÃ©phone" autoFocus />
          {errors.labelFr && <span className={styles.error}>{errors.labelFr.message}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>CatÃ©gorie</label>
          <input
            className={styles.input}
            {...register('category')}
            placeholder="Ex : Contact, Bibliographieâ€¦"
            list="categories-suggestions"
          />
          <datalist id="categories-suggestions">
            {COMMON_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Type de champ <span className={styles.req}>*</span></label>
        <select className={styles.select} {...register('fieldType')}>
          {FIELD_TYPES.map((ft) => (
            <option key={ft} value={ft}>{FIELD_TYPE_LABELS[ft]}</option>
          ))}
        </select>
      </div>

      {/* ThÃ©saurus â€” choisir lequel */}
      {fieldType === 'thesaurus' && (
        <div className={styles.field}>
          <label className={styles.label}>ThÃ©saurus liÃ© <span className={styles.req}>*</span></label>
          {thesauri.length === 0
            ? <p className={styles.hint}>Aucun thÃ©saurus disponible. CrÃ©ez-en un dans l'onglet ThÃ©saurus.</p>
            : <select className={styles.select} {...register('thesaurusId')}>
                <option value="">â€” Choisir â€”</option>
                {thesauri.map((t) => <option key={t.id} value={t.id}>{t.nameFr}</option>)}
              </select>
          }
        </div>
      )}

      {/* Select â€” gÃ©rer les options */}
      {fieldType === 'select' && (
        <div className={styles.field}>
          <label className={styles.label}>Options de la liste</label>
          <div className={styles.optionsList}>
            {options.map((o, i) => (
              <span key={i} className={styles.optionTag}>
                {o}
                <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}>Ã—</button>
              </span>
            ))}
          </div>
          <div className={styles.optionAdd}>
            <input
              className={styles.input}
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
              placeholder="Nouvelle optionâ€¦"
            />
            <button type="button" className={styles.btnAddOption} onClick={addOption}>Ajouter</button>
          </div>
          {options.length === 0 && <span className={styles.hint}>Appuyez sur EntrÃ©e pour ajouter une option.</span>}
        </div>
      )}

      <label className={styles.checkboxRow}>
        <input type="checkbox" className={styles.checkbox} {...register('required')} />
        <span className={styles.checkboxLabel}>Champ obligatoire</span>
      </label>

      {createChamp.isError && (
        <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez rÃ©essayer.</p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrementâ€¦' : 'CrÃ©er le champ'}
        </button>
      </div>
    </form>
  )
}




