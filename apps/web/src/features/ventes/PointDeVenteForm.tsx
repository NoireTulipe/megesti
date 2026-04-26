import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreatePointDeVente, useUpdatePointDeVente } from './hooks/usePointsDeVente'
import type { PointDeVente } from './hooks/usePointsDeVente'
import { useCategoriesPointDeVente } from './hooks/useCategoriesPointDeVente'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import styles from '@/styles/entityForm.module.css'

const FIXED_CATEGORIES = FIXED_SECTIONS.pointDeVente.map((s) => s.label)

const optNum = z.preprocess(
  (v) => (v === '' || v === undefined || v === null) ? undefined : v,
  z.coerce.number().min(0).optional(),
)

const schema = z.object({
  nom:                z.string().min(1, 'Requis'),
  categorieId:        z.string().optional().nullable(),
  commissionFixe:     optNum,
  commissionPourcent: optNum,
  encaissementDirect: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:      () => void
  pointDeVente?: PointDeVente
}

export function PointDeVenteForm({ onClose, pointDeVente }: Props) {
  const isEdit           = Boolean(pointDeVente)
  const create           = useCreatePointDeVente()
  const update           = useUpdatePointDeVente()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: categories = [] }  = useCategoriesPointDeVente()
  const { data: allChamps = [] }   = useCustomFields('pointDeVente')
  const { data: customValues = {} } = useCustomFieldValues(pointDeVente?.id, { enabled: !!pointDeVente?.id })

  const { register, handleSubmit, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: pointDeVente ? {
      nom:                pointDeVente.nom,
      categorieId:        pointDeVente.categorieId ?? undefined,
      commissionFixe:     pointDeVente.commissionFixe     != null ? Number(pointDeVente.commissionFixe)     : undefined,
      commissionPourcent: pointDeVente.commissionPourcent != null ? Number(pointDeVente.commissionPourcent) : undefined,
      encaissementDirect: pointDeVente.encaissementDirect,
    } : { encaissementDirect: true },
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
      nom:                values.nom,
      categorieId:        values.categorieId || null,
      commissionFixe:     values.commissionFixe     ?? null,
      commissionPourcent: values.commissionPourcent ?? null,
      encaissementDirect: values.encaissementDirect,
    }

    const entityId = isEdit ? pointDeVente!.id : crypto.randomUUID()
    if (isEdit) {
      await update.mutateAsync({ id: entityId, ...payload })
    } else {
      await create.mutateAsync({ id: entityId, ...payload })
    }

    const customPayload = Object.entries(allValues)
      .filter(([key]) => key.startsWith('custom_'))
      .map(([key, value]) => ({ definitionId: key.replace('custom_', ''), value: value != null && value !== '' ? String(value) : null }))
    if (customPayload.length > 0) await saveCustomValues.mutateAsync({ entityId, values: customPayload })

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
        <div className={styles.field}>
          <label className={styles.label} htmlFor="categorieId">Catégorie</label>
          <select id="categorieId" className={styles.input} {...register('categorieId')}>
            <option value="">— Aucune —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="commissionFixe">Commission fixe (€)</label>
            <input id="commissionFixe" className={styles.input} inputMode="decimal" placeholder="0.00" {...register('commissionFixe')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="commissionPourcent">Commission (%)</label>
            <input id="commissionPourcent" className={styles.input} inputMode="decimal" placeholder="0" {...register('commissionPourcent')} />
          </div>
        </div>
        <CustomFieldsRenderer entityType="pointDeVente" onlyCategory="Informations" register={register} errors={errors} />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Encaissement</p>
        <div className={styles.field}>
          <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" {...register('encaissementDirect')} style={{ width: 16, height: 16 }} />
            Encaissement direct par la ME
          </label>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', margin: 0 }}>
            Si décoché, le point de vente encaisse et reverse ensuite à la ME.
          </p>
        </div>
        <CustomFieldsRenderer entityType="pointDeVente" onlyCategory="Encaissement" register={register} errors={errors} />
      </div>

      <CustomFieldsRenderer entityType="pointDeVente" excludeCategories={FIXED_CATEGORIES} register={register} errors={errors} />

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le point de vente'}
        </button>
      </div>
    </form>
  )
}
