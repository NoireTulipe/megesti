import { generateUUID } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateAuteur, useUpdateAuteur } from './hooks/useAuteurs'
import type { Auteur } from './hooks/useAuteurs'
import { ContratsAuteurSection } from './ContratsAuteurSection'
import { useCreateContratAuteur } from './hooks/useContratsAuteur'
import { useTypesDA } from '@/features/reglages/hooks/useTypesDA'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { useCustomFields } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { FIXED_SECTIONS } from '@/lib/fixedSections'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { DateInput } from '@/components/DateInput'
import { todayISO } from '@/lib/date'
import styles from './AuteurForm.module.css'

const FIXED_CATEGORIES = FIXED_SECTIONS.auteur.map((s) => s.label)

const schema = z.object({
  prenom:     z.string().min(1, 'Requis'),
  nom:        z.string().min(1, 'Requis'),
  pseudonyme: z.string().optional(),
  email:      z.string().email('Email invalide').optional().or(z.literal('')),
  bio:        z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:  () => void
  auteur?:  Auteur
}

export function AuteurForm({ onClose, auteur }: Props) {
  const { features }       = usePlanFeatures()
  const isEdit             = Boolean(auteur)
  const createAuteur       = useCreateAuteur()
  const updateAuteur       = useUpdateAuteur()
  const createContrat      = useCreateContratAuteur()
  const { data: typesDA = [] } = useTypesDA()
  const saveCustomValues   = useSaveCustomFieldValues()

  const [avecContrat,        setAvecContrat]       = useState(false)
  const [contratTypeDAId,    setContratTypeDAId]   = useState('')
  const [contratDateSig,     setContratDateSig]    = useState(todayISO())
  const [contratDureeAns,    setContratDureeAns]   = useState('')
  const [contratReconduite,  setContratReconduite] = useState(true)
  const { data: allChamps = [] }    = useCustomFields('auteur')
  const { data: customValues = {} } = useCustomFieldValues(auteur?.id, { enabled: !!auteur?.id })

  const { register, handleSubmit, control, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: auteur ? {
        prenom:     auteur.prenom,
        nom:        auteur.nom,
        pseudonyme: auteur.pseudonyme ?? '',
        email:      auteur.email      ?? '',
        bio:        auteur.bio        ?? '',
      } : {},
    })

  // Remplir les champs custom quand les valeurs chargent (mode édition)
  useEffect(() => {
    if (isEdit && Object.keys(customValues).length > 0) {
      Object.entries(customValues).forEach(([defId, val]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue(`custom_${defId}` as any, val ?? '')
      })
    }
  }, [customValues, isEdit, setValue])

  const prenom = useWatch({ control, name: 'prenom',     defaultValue: auteur?.prenom     ?? '' })
  const nom    = useWatch({ control, name: 'nom',        defaultValue: auteur?.nom        ?? '' })
  const pseudo = useWatch({ control, name: 'pseudonyme', defaultValue: auteur?.pseudonyme ?? '' })

  const initiales  = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?'
  const nomAffiche = pseudo || [prenom, nom].filter(Boolean).join(' ') || 'Nouvel auteur'
  const isError    = isEdit ? updateAuteur.isError : createAuteur.isError

  async function onSubmit(values: FormValues) {
    const allValues = getValues() as Record<string, unknown>

    // zodResolver ignore les règles field-level → validation manuelle des champs custom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasErrors = validateCustomFields(allChamps, allValues, setError as any, clearErrors as any)
    if (hasErrors) return

    const customPayload = Object.entries(allValues)
      .filter(([key]) => key.startsWith('custom_'))
      .map(([key, value]) => ({
        definitionId: key.replace('custom_', ''),
        value:        value != null && value !== '' ? String(value) : null,
      }))

    const entityId = isEdit ? auteur!.id : generateUUID()

    if (isEdit) {
      await updateAuteur.mutateAsync({
        id:         entityId,
        prenom:     values.prenom,
        nom:        values.nom,
        pseudonyme: values.pseudonyme || undefined,
        email:      values.email      || undefined,
        bio:        values.bio        || undefined,
      })
    } else {
      await createAuteur.mutateAsync({
        id:         entityId,
        prenom:     values.prenom,
        nom:        values.nom,
        pseudonyme: values.pseudonyme || undefined,
        email:      values.email      || undefined,
        bio:        values.bio        || undefined,
      })
      // Contrat inline à la création
      if (avecContrat && contratTypeDAId) {
        const sigDate = contratDateSig ? `${contratDateSig}T00:00:00.000Z` : undefined
        await createContrat.mutateAsync({
          id:               generateUUID(),
          auteurId:         entityId,
          typeDAId:         contratTypeDAId,
          dateSignature:    sigDate,
          datePriseEffet:   sigDate,
          dureeAns:         contratDureeAns ? Number(contratDureeAns) : undefined,
          reconduiteTacite: contratReconduite,
        })
      }
    }

    if (customPayload.length > 0) {
      await saveCustomValues.mutateAsync({ entityId, values: customPayload })
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      <div className={styles.preview}>
        <div className={styles.avatarLarge}>{initiales}</div>
        <div className={styles.previewText}>
          <span className={styles.previewNom}>{nomAffiche}</span>
          <span className={styles.previewHint}>{isEdit ? 'Modification de la fiche' : 'Aperçu de la fiche auteur'}</span>
        </div>
      </div>

      {/* •"?•"? Identité •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Identité</p>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prenom">Prénom <span className={styles.req}>*</span></label>
            <input id="prenom" className={`${styles.input} ${errors.prenom ? styles.inputError : ''}`} {...register('prenom')} autoFocus />
            {errors.prenom && <span className={styles.error}>{errors.prenom.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nom">Nom <span className={styles.req}>*</span></label>
            <input id="nom" className={`${styles.input} ${errors.nom ? styles.inputError : ''}`} {...register('nom')} />
            {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pseudonyme">Pseudonyme</label>
          <input id="pseudonyme" className={styles.input} {...register('pseudonyme')} placeholder="Remplace le nom civil dans l'affichage" />
        </div>
        <CustomFieldsRenderer entityType="auteur" onlyCategory="Identité" register={register} errors={errors} />
      </div>

      {/* •"?•"? Contact •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Contact</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Adresse email</label>
          <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} {...register('email')} placeholder="Optionnel" />
          {errors.email && <span className={styles.error}>{errors.email.message}</span>}
        </div>
        <CustomFieldsRenderer entityType="auteur" onlyCategory="Contact" register={register} errors={errors} />
      </div>

      {/* •"?•"? Biographie •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Biographie</p>
        <div className={styles.field}>
          <textarea id="bio" className={styles.textarea} rows={5} {...register('bio')}
            placeholder="Quelques mots sur l'auteur, son parcours, ses thèmes de prédilection…" />
        </div>
        <CustomFieldsRenderer entityType="auteur" onlyCategory="Biographie" register={register} errors={errors} />
      </div>

      {/* •"?•"? Autres sections custom •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <CustomFieldsRenderer
        entityType="auteur"
        excludeCategories={FIXED_CATEGORIES}
        register={register}
        errors={errors}
      />

      {/* •"?•"? Contrats & barèmes DA •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {isEdit && auteur && features.contratsAuteurs && <ContratsAuteurSection auteur={auteur} />}

      {/* •"?•"? Contrat ME à la création •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {!isEdit && features.contratsAuteurs && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Contrat ME</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={avecContrat}
              onChange={(e) => setAvecContrat(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--ink)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 500 }}>
              Cet auteur est sous contrat avec la maison d'édition
            </span>
          </label>

          {avecContrat && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: '12px 14px', background: 'var(--ink-faint)', borderRadius: 10, border: '1px solid var(--cream-dark)' }}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Barème DA *</label>
                  <select className={styles.input} value={contratTypeDAId} onChange={(e) => setContratTypeDAId(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {typesDA.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Date de signature</label>
                  <DateInput className={styles.input} value={contratDateSig} onChange={setContratDateSig} />
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Durée (années)</label>
                  <input type="number" min={1} className={styles.input} value={contratDureeAns} onChange={(e) => setContratDureeAns(e.target.value)} placeholder="Indéterminée si vide" />
                </div>
                {contratDureeAns && (
                  <div className={styles.field} style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <input type="checkbox" checked={contratReconduite} onChange={(e) => setContratReconduite(e.target.checked)} style={{ accentColor: 'var(--ink)' }} />
                      Reconduite tacite
                    </label>
                  </div>
                )}
              </div>
              {!contratTypeDAId && (
                <p style={{ fontSize: '0.72rem', color: 'var(--terra)', margin: 0 }}>
                  Sélectionne un barème pour activer le contrat. Si aucun barème n'existe, crée-en un dans Réglages → Barèmes DA.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer la fiche auteur'}
        </button>
      </div>
    </form>
  )
}




