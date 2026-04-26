import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateDepotLibraire, useUpdateDepotLibraire } from './hooks/useDepotsLibraires'
import type { DepotLibraire } from './hooks/useDepotsLibraires'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import styles from '@/styles/entityForm.module.css'

const FIXED_CATEGORIES = FIXED_SECTIONS.depotLibraire.map((s) => s.label)

const schema = z.object({
  nom:     z.string().min(1, 'Requis'),
  contact: z.string().optional(),
  adresse: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:       () => void
  depotLibraire?: DepotLibraire
}

export function DepotLibraireForm({ onClose, depotLibraire }: Props) {
  const isEdit           = Boolean(depotLibraire)
  const create           = useCreateDepotLibraire()
  const update           = useUpdateDepotLibraire()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: allChamps = [] }    = useCustomFields('depotLibraire')
  const { data: customValues = {} } = useCustomFieldValues(depotLibraire?.id, { enabled: !!depotLibraire?.id })

  const { register, handleSubmit, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: depotLibraire ? {
      nom:     depotLibraire.nom,
      contact: depotLibraire.contact ?? '',
      adresse: depotLibraire.adresse ?? '',
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
      nom:     values.nom,
      contact: values.contact || undefined,
      adresse: values.adresse || undefined,
    }

    const entityId = isEdit ? depotLibraire!.id : crypto.randomUUID()
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
          <label className={styles.label} htmlFor="nom">Nom du dépôt <span className={styles.req}>*</span></label>
          <input id="nom" className={`${styles.input} ${errors.nom ? styles.inputError : ''}`} {...register('nom')} autoFocus />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact">Contact</label>
          <input id="contact" className={styles.input} {...register('contact')} placeholder="Nom, téléphone…" />
        </div>
        <CustomFieldsRenderer entityType="depotLibraire" onlyCategory="Informations" register={register} errors={errors} />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Adresse</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="adresse">Adresse</label>
          <textarea id="adresse" className={styles.textarea} rows={3} {...register('adresse')} />
        </div>
        <CustomFieldsRenderer entityType="depotLibraire" onlyCategory="Adresse" register={register} errors={errors} />
      </div>

      <CustomFieldsRenderer
        entityType="depotLibraire"
        excludeCategories={FIXED_CATEGORIES}
        register={register}
        errors={errors}
      />

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le dépôt'}
        </button>
      </div>
    </form>
  )
}
