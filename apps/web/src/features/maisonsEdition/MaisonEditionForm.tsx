import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateMaisonEdition, useUpdateMaisonEdition } from './hooks/useMaisonsEdition'
import type { MaisonEdition } from './hooks/useMaisonsEdition'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import styles from '@/styles/entityForm.module.css'

const FIXED_CATEGORIES = FIXED_SECTIONS.maisonEdition.map((s) => s.label)

const schema = z.object({
  nom:       z.string().min(1, 'Requis'),
  siret:     z.string().optional(),
  email:     z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:       () => void
  maisonEdition?: MaisonEdition
}

export function MaisonEditionForm({ onClose, maisonEdition }: Props) {
  const isEdit           = Boolean(maisonEdition)
  const create           = useCreateMaisonEdition()
  const update           = useUpdateMaisonEdition()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: allChamps = [] }    = useCustomFields('maisonEdition')
  const { data: customValues = {} } = useCustomFieldValues(maisonEdition?.id, { enabled: !!maisonEdition?.id })

  const { register, handleSubmit, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: maisonEdition ? {
      nom:       maisonEdition.nom,
      siret:     maisonEdition.siret     ?? '',
      email:     maisonEdition.email     ?? '',
      telephone: maisonEdition.telephone ?? '',
      adresse:   maisonEdition.adresse   ?? '',
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
      siret:     values.siret     || undefined,
      email:     values.email     || undefined,
      telephone: values.telephone || undefined,
      adresse:   values.adresse   || undefined,
    }

    const entityId = isEdit ? maisonEdition!.id : crypto.randomUUID()
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
          <label className={styles.label} htmlFor="nom">Nom <span className={styles.req}>*</span></label>
          <input id="nom" className={`${styles.input} ${errors.nom ? styles.inputError : ''}`} {...register('nom')} autoFocus />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="siret">SIRET</label>
            <input id="siret" className={styles.input} {...register('siret')} placeholder="12345678901234" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} {...register('email')} />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </div>
        </div>
        <CustomFieldsRenderer entityType="maisonEdition" onlyCategory="Informations" register={register} errors={errors} />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Adresse</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="telephone">Téléphone</label>
          <input id="telephone" className={styles.input} {...register('telephone')} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="adresse">Adresse</label>
          <textarea id="adresse" className={styles.textarea} rows={3} {...register('adresse')} />
        </div>
        <CustomFieldsRenderer entityType="maisonEdition" onlyCategory="Adresse" register={register} errors={errors} />
      </div>

      <CustomFieldsRenderer
        entityType="maisonEdition"
        excludeCategories={FIXED_CATEGORIES}
        register={register}
        errors={errors}
      />

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la maison'}
        </button>
      </div>
    </form>
  )
}
