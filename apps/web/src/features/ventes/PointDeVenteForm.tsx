import { generateUUID } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { useCreatePointDeVente, useUpdatePointDeVente } from './hooks/usePointsDeVente'
import type { PointDeVente, ContactPointDeVente, TypePaiementRemise } from './hooks/usePointsDeVente'
import { useCategoriesPointDeVente } from './hooks/useCategoriesPointDeVente'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import styles from '@/styles/entityForm.module.css'
import fStyles from './PointDeVenteForm.module.css'

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

interface ContactRow {
  nom: string; prenom: string; email: string; telephone: string
  typePaiement: TypePaiementRemise | ''
}

interface Props {
  onClose:       () => void
  pointDeVente?: PointDeVente
}

export function PointDeVenteForm({ onClose, pointDeVente }: Props) {
  const isEdit           = Boolean(pointDeVente)
  const create           = useCreatePointDeVente()
  const update           = useUpdatePointDeVente()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: categories = [] }   = useCategoriesPointDeVente()
  const { data: allChamps = [] }    = useCustomFields('pointDeVente')
  const { data: customValues = {} } = useCustomFieldValues(pointDeVente?.id, { enabled: !!pointDeVente?.id })

  const [contacts, setContacts] = useState<ContactRow[]>(
    pointDeVente?.contacts.map(c => ({
      nom: c.nom, prenom: c.prenom ?? '', email: c.email ?? '',
      telephone: c.telephone ?? '', typePaiement: c.typePaiement ?? '',
    })) ?? []
  )

  const { register, handleSubmit, watch, setValue, getValues, setError, clearErrors,
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

  const encaissementDirect = watch('encaissementDirect')

  useEffect(() => {
    if (isEdit && Object.keys(customValues).length > 0) {
      Object.entries(customValues).forEach(([defId, val]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue(`custom_${defId}` as any, val ?? '')
      })
    }
  }, [customValues, isEdit, setValue])

  const { can, upgradeMessage } = usePlanFeatures()
  const canReversements = can('reversements')

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
      contacts: contacts
        .filter(c => c.nom.trim())
        .map(c => ({
          nom:          c.nom,
          prenom:       c.prenom       || null,
          email:        c.email        || null,
          telephone:    c.telephone    || null,
          typePaiement: (c.typePaiement as TypePaiementRemise) || null,
        })),
    }

    const entityId = isEdit ? pointDeVente!.id : generateUUID()
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

  function addContact() {
    setContacts(prev => [...prev, { nom: '', prenom: '', email: '', telephone: '', typePaiement: '' }])
  }
  function removeContact(i: number) {
    setContacts(prev => prev.filter((_, j) => j !== i))
  }
  function updateContact(i: number, key: keyof ContactRow, val: string) {
    setContacts(prev => prev.map((c, j) => j === i ? { ...c, [key]: val } : c))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      {/* •"?•"? Informations •"?•"? */}
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
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
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

      {/* •"?•"? Encaissement •"?•"? */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Encaissement</p>
        <div className={fStyles.encaissRow}>
          <button
            type="button"
            className={`${fStyles.encaissBtn} ${encaissementDirect ? fStyles.encaissBtnActive : ''}`}
            onClick={() => setValue('encaissementDirect', true)}
          >
            <span className={fStyles.encaissEmoji}>💳</span>
            <span className={fStyles.encaissLabel}>Direct par la ME</span>
            <span className={fStyles.encaissDesc}>CB, espèces, chèque…</span>
          </button>
          <button
            type="button"
            className={`${fStyles.encaissBtn} ${!encaissementDirect ? fStyles.encaissBtnActive : ''} ${!canReversements ? fStyles.encaissBtnLocked : ''}`}
            onClick={() => canReversements && setValue('encaissementDirect', false)}
            title={!canReversements ? upgradeMessage('reversements') : undefined}
          >
            <span className={fStyles.encaissEmoji}>{canReversements ? '🏬' : '🔒'}</span>
            <span className={fStyles.encaissLabel}>Par le point de vente</span>
            <span className={fStyles.encaissDesc}>{canReversements ? 'Le PDV encaisse, reverse ensuite' : 'Plan Édition requis'}</span>
          </button>
        </div>
        <input type="hidden" {...register('encaissementDirect')} />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.55, margin: '8px 0 0', padding: '10px 12px', background: 'var(--cream)', borderRadius: 8 }}>
          {encaissementDirect
            ? '💳 Vous encaissez directement les paiements (CB, espèces, chèque…) lors de vos ventes. MeGesti enregistre chaque règlement en temps réel.'
            : '🏬 Le point de vente encaisse à votre place (ex : librairie partenaire). Vous recevrez un reversement par la suite. MeGesti suit les commissions et les reversements dus.'}
        </p>
        <CustomFieldsRenderer entityType="pointDeVente" onlyCategory="Encaissement" register={register} errors={errors} />
      </div>

      {/* •"?•"? Contacts •"?•"? */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Contacts</p>
        {contacts.map((c, i) => (
          <div key={i} className={fStyles.contactCard}>
            <div className={fStyles.contactGrid}>
              <input className={fStyles.cInput} placeholder="Nom *" value={c.nom} onChange={e => updateContact(i, 'nom', e.target.value)} />
              <input className={fStyles.cInput} placeholder="Prénom" value={c.prenom} onChange={e => updateContact(i, 'prenom', e.target.value)} />
              <input className={fStyles.cInput} placeholder="Email" type="email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
              <input className={fStyles.cInput} placeholder="Téléphone" value={c.telephone} onChange={e => updateContact(i, 'telephone', e.target.value)} />
              <select
                className={fStyles.cSelect}
                value={c.typePaiement}
                onChange={e => updateContact(i, 'typePaiement', e.target.value)}
              >
                <option value="">— Mode de remise —</option>
                <option value="VIREMENT">🏦 Virement bancaire</option>
                <option value="CHEQUE">📝 Chèque</option>
              </select>
            </div>
            <button type="button" className={fStyles.removeBtn} onClick={() => removeContact(i)}>
              <X size={13} />
            </button>
          </div>
        ))}
        <button type="button" className={fStyles.addBtn} onClick={addContact}>
          <Plus size={13} /> Ajouter un contact
        </button>
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




