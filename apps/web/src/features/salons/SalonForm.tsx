import { generateUUID } from '@/lib/utils'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSalon, useUpdateSalon } from './hooks/useSalons'
import type { Salon } from './hooks/useSalons'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import styles from '@/styles/entityForm.module.css'

const FIXED_CATEGORIES = FIXED_SECTIONS.salon.map((s) => s.label)

const schema = z.object({
  nom:       z.string().min(1, 'Requis'),
  lieu:      z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose: () => void
  salon?:  Salon
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

export function SalonForm({ onClose, salon }: Props) {
  const isEdit           = Boolean(salon)
  const create           = useCreateSalon()
  const update           = useUpdateSalon()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: allChamps = [] }    = useCustomFields('salon')
  const { data: customValues = {} } = useCustomFieldValues(salon?.id, { enabled: !!salon?.id })

  const { register, handleSubmit, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: salon ? {
      nom:       salon.nom,
      lieu:      salon.lieu      ?? '',
      dateDebut: toDateInput(salon.dateDebut),
      dateFin:   toDateInput(salon.dateFin),
    } : {},
  })

  useEffect(() => {
    if (isEdit && Object.keys(customValues).length > 0) {
      Object.entries(customValues).forEach(([defId, val]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue(`custom_${defId}` as any, val ?? '')
      })
    }
  }, [customValues, isEdit, setValue])

  const isError = isEdit ? update.isError : create.isError

  async function onSubmit(values: FormValues) {
    const allValues = getValues() as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasErrors = validateCustomFields(allChamps, allValues, setError as any, clearErrors as any)
    if (hasErrors) return

    const payload = {
      nom:       values.nom,
      lieu:      values.lieu      || undefined,
      dateDebut: values.dateDebut ? new Date(values.dateDebut).toISOString() : undefined,
      dateFin:   values.dateFin   ? new Date(values.dateFin).toISOString()   : undefined,
    }

    const entityId = isEdit ? salon!.id : generateUUID()
    if (isEdit) {
      await update.mutateAsync({ id: entityId, ...payload })
    } else {
      await create.mutateAsync({ id: entityId, ...payload })
    }

    const customPayload = Object.entries(allValues)
      .filter(([key]) => key.startsWith('custom_'))
      .map(([key, value]) => ({
        definitionId: key.replace('custom_', ''),
        value: value != null && value !== '' ? String(value) : null,
      }))
    if (customPayload.length > 0) {
      await saveCustomValues.mutateAsync({ entityId, values: customPayload })
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Informations</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nom">Nom du salon <span className={styles.req}>*</span></label>
          <input id="nom" className={`${styles.input} ${errors.nom ? styles.inputError : ''}`} {...register('nom')} autoFocus />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lieu">Lieu</label>
          <input id="lieu" className={styles.input} {...register('lieu')} placeholder="Ville, salleâ€¦" />
        </div>
        <CustomFieldsRenderer entityType="salon" onlyCategory="Informations" register={register} errors={errors} />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Dates du prochain salon</p>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="dateDebut">Date de dÃ©but</label>
            <input id="dateDebut" type="date" className={styles.input} {...register('dateDebut')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="dateFin">Date de fin</label>
            <input id="dateFin" type="date" className={styles.input} {...register('dateFin')} />
          </div>
        </div>
        <CustomFieldsRenderer entityType="salon" onlyCategory="Dates" register={register} errors={errors} />
      </div>

      <CustomFieldsRenderer
        entityType="salon"
        excludeCategories={FIXED_CATEGORIES}
        register={register}
        errors={errors}
      />

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez rÃ©essayer.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrementâ€¦' : isEdit ? 'Enregistrer' : 'CrÃ©er le salon'}
        </button>
      </div>
    </form>
  )
}




