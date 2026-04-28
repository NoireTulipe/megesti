import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateArticle, useUpdateArticle, useSetArticleActif } from './hooks/useArticles'
import { useRayons } from './hooks/useRayons'
import { useAuteurs } from '../auteurs/hooks/useAuteurs'
import { useCustomFieldsByRayon } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { DualRangeSlider } from '@/components/DualRangeSlider'
import type { Article } from './types'
import styles from './ArticleForm.module.css'

const optNum = z.preprocess(
  (v) => (v === '' || v === undefined || v === null) ? undefined : v,
  z.coerce.number().min(0).optional(),
)
const optInt = z.preprocess(
  (v) => (v === '' || v === undefined || v === null) ? undefined : v,
  z.coerce.number().int().min(1).optional(),
)

const schema = z.object({
  rayonId:         z.string().min(1, 'Requis'),
  categorieId:     z.string().optional().nullable(),
  nom:             z.string().min(1, 'Requis'),
  reference:       z.string().optional(),
  description:     z.string().optional(),
  imageUrl:        z.string().optional(),
  prixVenteHT:     z.coerce.number({ invalid_type_error: 'Nombre requis' }).min(0, 'Doit être ≥ 0'),
  prixAchatHT:     optNum,
  prixAchatLotHT:  optNum,
  prixAchatLotQte: optInt,
  stock:           z.coerce.number().int().min(0).default(0),
  stockAlerte:     z.coerce.number().int().min(0).default(0),
  stockTension:    z.coerce.number().int().min(0).default(0),
  isbn:            z.string().optional(),
  datePublication: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:  () => void
  article?: Article
}

export function ArticleForm({ onClose, article }: Props) {
  const isEdit          = Boolean(article)
  const createArticle   = useCreateArticle()
  const updateArticle   = useUpdateArticle()
  const setActif        = useSetArticleActif()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: rayons = [] }     = useRayons()
  const { data: allAuteurs = [] } = useAuteurs({ avecContrat: true })
  const { data: customValues = {} } = useCustomFieldValues(article?.id, { enabled: !!article?.id })

  const [auteurIds, setAuteurIds]     = useState<string[]>(
    article?.auteurs.map((a) => a.auteur.id) ?? [],
  )
  const [auteurSearch, setAuteurSearch] = useState('')

  const { register, handleSubmit, control, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: article ? {
        rayonId:         article.rayonId,
        categorieId:     article.categorieId ?? undefined,
        nom:             article.nom,
        reference:       article.reference ?? '',
        description:     article.description ?? '',
        imageUrl:        article.imageUrl ?? '',
        prixVenteHT:     Number(article.prixVenteHT),
        prixAchatHT:     article.prixAchatHT    != null ? Number(article.prixAchatHT)    : undefined,
        prixAchatLotHT:  article.prixAchatLotHT != null ? Number(article.prixAchatLotHT) : undefined,
        prixAchatLotQte: article.prixAchatLotQte ?? undefined,
        stock:           article.stock,
        stockAlerte:     article.stockAlerte,
        stockTension:    article.stockTension,
        isbn:            article.isbn ?? '',
        datePublication: article.datePublication ?? '',
      } : { stock: 0 },
    })

  const selectedRayonId  = useWatch({ control, name: 'rayonId' })
  const watchStockAlerte  = useWatch({ control, name: 'stockAlerte',  defaultValue: article?.stockAlerte  ?? 0 })
  const watchStockTension = useWatch({ control, name: 'stockTension', defaultValue: article?.stockTension ?? 0 })

  const handleSeuils = useCallback((alerte: number, tension: number) => {
    setValue('stockAlerte',  alerte)
    setValue('stockTension', tension)
  }, [setValue])

  // Remplir les champs custom quand les valeurs chargent (mode édition)
  useEffect(() => {
    if (isEdit && Object.keys(customValues).length > 0) {
      Object.entries(customValues).forEach(([defId, val]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue(`custom_${defId}` as any, val ?? '')
      })
    }
  }, [customValues, isEdit, setValue])
  const selectedRayon   = rayons.find((r) => r.id === selectedRayonId)
  const isLibrairie     = selectedRayon?.isLibrairie ?? false
  const categories      = selectedRayon?.categories ?? []

  const { data: rayonChamps = [] } = useCustomFieldsByRayon(
    selectedRayonId ?? '', { enabled: !!selectedRayonId },
  )

  const filteredAuteurs = allAuteurs.filter((a) =>
    `${a.prenom} ${a.nom} ${a.pseudonyme ?? ''}`.toLowerCase().includes(auteurSearch.toLowerCase()),
  )

  function toggleAuteur(id: string) {
    setAuteurIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const rayonRegister = register('rayonId')

  async function onSubmit(values: FormValues) {
    if (selectedRayonId && rayonChamps.length > 0) {
      const allValues = getValues() as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasErrors = validateCustomFields(rayonChamps, allValues, setError as any, clearErrors as any)
      if (hasErrors) return
    }

    const payload = {
      rayonId:         values.rayonId,
      categorieId:     values.categorieId || null,
      nom:             values.nom,
      reference:       values.reference       || null,
      description:     values.description     || null,
      imageUrl:        values.imageUrl         || null,
      prixVenteHT:     values.prixVenteHT,
      prixAchatHT:     values.prixAchatHT     ?? null,
      prixAchatLotHT:  values.prixAchatLotHT  ?? null,
      prixAchatLotQte: values.prixAchatLotQte ?? null,
      stock:           values.stock,
      stockAlerte:     values.stockAlerte,
      stockTension:    values.stockTension,
      isbn:            isLibrairie ? (values.isbn            || null) : null,
      datePublication: isLibrairie ? (values.datePublication || null) : null,
      auteurIds:       isLibrairie ? auteurIds : [],
    }
    const entityId = isEdit ? article!.id : crypto.randomUUID()
    if (isEdit) {
      await updateArticle.mutateAsync({ id: entityId, ...payload })
    } else {
      await createArticle.mutateAsync({ id: entityId, ...payload })
    }

    const allValues    = getValues() as Record<string, unknown>
    const customPayload = Object.entries(allValues)
      .filter(([key]) => key.startsWith('custom_'))
      .map(([key, value]) => ({
        definitionId: key.replace('custom_', ''),
        value:        value != null && value !== '' ? String(value) : null,
      }))
    if (customPayload.length > 0) {
      await saveCustomValues.mutateAsync({ entityId, values: customPayload })
    }

    onClose()
  }

  const isError = isEdit ? updateArticle.isError : createArticle.isError

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      {/* ── Classification ──────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Classification</p>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rayonId">
              Rayon <span className={styles.req}>*</span>
            </label>
            <select
              id="rayonId"
              className={`${styles.select} ${errors.rayonId ? styles.inputError : ''}`}
              {...rayonRegister}
              onChange={(e) => {
                rayonRegister.onChange(e)
                setValue('categorieId', undefined)
              }}
            >
              <option value="">— Choisir —</option>
              {rayons.map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
            {errors.rayonId && <span className={styles.error}>{errors.rayonId.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="categorieId">Catégorie</label>
            <select
              id="categorieId"
              className={styles.select}
              disabled={categories.length === 0}
              {...register('categorieId')}
            >
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Informations ────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Informations</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nom">
            Nom <span className={styles.req}>*</span>
          </label>
          <input
            id="nom"
            className={`${styles.input} ${errors.nom ? styles.inputError : ''}`}
            {...register('nom')}
            autoFocus
          />
          {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reference">Référence</label>
            <input id="reference" className={styles.input} {...register('reference')} placeholder="SKU, code interne…" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="imageUrl">Image (URL)</label>
            <input id="imageUrl" className={styles.input} {...register('imageUrl')} placeholder="https://…" />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">Description</label>
          <textarea id="description" className={styles.textarea} rows={3} {...register('description')} />
        </div>
      </div>

      {/* ── Tarification ────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Tarification</p>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixVenteHT">
              Prix de vente HT <span className={styles.req}>*</span>
            </label>
            <div className={styles.inputWithUnit}>
              <input
                id="prixVenteHT"
                className={`${styles.input} ${errors.prixVenteHT ? styles.inputError : ''}`}
                inputMode="decimal"
                placeholder="0.00"
                {...register('prixVenteHT')}
              />
              <span className={styles.unit}>€</span>
            </div>
            {errors.prixVenteHT && <span className={styles.error}>{errors.prixVenteHT.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatHT">Prix d'achat HT</label>
            <div className={styles.inputWithUnit}>
              <input id="prixAchatHT" className={styles.input} inputMode="decimal" placeholder="0.00" {...register('prixAchatHT')} />
              <span className={styles.unit}>€</span>
            </div>
          </div>
        </div>
        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatLotHT">Prix lot HT</label>
            <div className={styles.inputWithUnit}>
              <input id="prixAchatLotHT" className={styles.input} inputMode="decimal" placeholder="0.00" {...register('prixAchatLotHT')} />
              <span className={styles.unit}>€</span>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatLotQte">Qté/lot</label>
            <input id="prixAchatLotQte" className={styles.input} inputMode="numeric" placeholder="ex : 5" {...register('prixAchatLotQte')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="stock">Stock</label>
            <input id="stock" className={styles.input} inputMode="numeric" placeholder="0" {...register('stock')} />
          </div>
        </div>
        <DualRangeSlider
          alerte={watchStockAlerte}
          tension={watchStockTension}
          max={Math.max((watchStockTension || 0) * 2, 50)}
          onChange={handleSeuils}
        />
      </div>

      {/* ── Librairie ───────────────────────────────────────────── */}
      {isLibrairie && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Librairie</p>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="isbn">ISBN</label>
              <input id="isbn" className={styles.input} {...register('isbn')} placeholder="978-…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="datePublication">Date de publication</label>
              <input id="datePublication" type="date" className={styles.input} {...register('datePublication')} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Auteurs</label>
            <input
              className={styles.auteurSearch}
              placeholder="Rechercher un auteur…"
              value={auteurSearch}
              onChange={(e) => setAuteurSearch(e.target.value)}
            />
            <div className={styles.auteurList}>
              {filteredAuteurs.length === 0 && (
                <p className={styles.auteurEmpty}>Aucun auteur trouvé.</p>
              )}
              {filteredAuteurs.map((a) => {
                const selected = auteurIds.includes(a.id)
                return (
                  <label key={a.id} className={`${styles.auteurRow} ${selected ? styles.auteurRowSelected : ''}`}>
                    <input
                      type="checkbox"
                      className={styles.auteurCheck}
                      checked={selected}
                      onChange={() => toggleAuteur(a.id)}
                    />
                    <span>{a.pseudonyme ?? `${a.prenom} ${a.nom}`}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Champs custom du rayon ──────────────────────────────── */}
      {selectedRayonId && (
        <CustomFieldsRenderer rayonId={selectedRayonId} register={register} errors={errors} />
      )}

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

      {/* ── Statut catalogue (mode édition uniquement) ─────────── */}
      {isEdit && article && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: article.actif ? 'var(--ink-faint)' : 'rgba(220,38,38,0.06)',
          border: `1.5px solid ${article.actif ? 'var(--cream-dark)' : 'rgba(220,38,38,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: article.actif ? 'var(--ink)' : '#DC2626' }}>
              {article.actif ? 'Article en catalogue' : 'Article retiré du catalogue'}
            </span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', margin: '2px 0 0' }}>
              {article.actif
                ? 'Visible dans les ventes et le catalogue.'
                : 'Conservé en base pour l\'historique. Non disponible à la vente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await setActif.mutateAsync({ id: article.id, actif: !article.actif })
              onClose()
            }}
            disabled={setActif.isPending}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              border: article.actif ? '1.5px solid rgba(220,38,38,0.3)' : '1.5px solid rgba(5,150,105,0.3)',
              background: article.actif ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.06)',
              color: article.actif ? '#DC2626' : '#059669',
              transition: 'background 0.15s',
            }}
          >
            {setActif.isPending ? '…' : article.actif ? 'Retirer du catalogue' : 'Remettre au catalogue'}
          </button>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer l\'article'}
        </button>
      </div>
    </form>
  )
}
