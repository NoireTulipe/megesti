import { generateUUID } from '@/lib/utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateArticle, useUpdateArticle, useSetArticleActif } from './hooks/useArticles'
import { useRayons } from './hooks/useRayons'
import { useAuteurs } from '../auteurs/hooks/useAuteurs'
import { useImprimeurs } from '../imprimeurs/hooks/useImprimeurs'
import { useCustomFieldsByRayon } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { DualRangeSlider } from '@/components/DualRangeSlider'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'
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
  prixVenteHT:     z.coerce.number({ invalid_type_error: 'Nombre requis' }).min(0, 'Doit Ãªtre â‰¥ 0'),
  prixAchatHT:     optNum,
  prixAchatLotHT:  optNum,
  prixAchatLotQte: optInt,
  stock:           z.coerce.number().int().min(0).default(0),
  stockAlerte:     z.coerce.number().int().min(0).default(0),
  stockTension:    z.coerce.number().int().min(0).default(0),
  isbn:            z.string().optional(),
  datePublication: z.string().optional(),
  imprimeurId:     z.string().optional().nullable(),
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
  const { data: rayons = [] }      = useRayons()
  const { data: allAuteurs = [] }  = useAuteurs({ avecContrat: true })
  const { data: imprimeurs = [] }  = useImprimeurs()
  const { data: customValues = {} } = useCustomFieldValues(article?.id, { enabled: !!article?.id })

  const franchiseTVA      = useFranchiseTVA()
  const { features }      = usePlanFeatures()
  const { data: tenant }  = useMonTenant()
  const reseauOnly        = features.auteurs === 'reseau'
  const [prixTTC, setPrixTTC] = useState<string>('')
  const ttcInitialized  = useRef(false)

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
        imprimeurId:     article.imprimeurId ?? null,
      } : { stock: 0 },
    })

  const selectedRayonId    = useWatch({ control, name: 'rayonId' })
  const watchPrixHT        = useWatch({ control, name: 'prixVenteHT' })
  const watchLotHT         = useWatch({ control, name: 'prixAchatLotHT' })
  const watchLotQte        = useWatch({ control, name: 'prixAchatLotQte' })
  const watchStockAlerte   = useWatch({ control, name: 'stockAlerte',  defaultValue: article?.stockAlerte  ?? 0 })
  const watchStockTension  = useWatch({ control, name: 'stockTension', defaultValue: article?.stockTension ?? 0 })

  // Calcul automatique du prix unitaire depuis le lot
  const lotValide = watchLotHT != null && watchLotHT > 0 && watchLotQte != null && watchLotQte > 0
  const prixUnitaireCalcule = lotValide
    ? Math.round((Number(watchLotHT) / Number(watchLotQte)) * 10000) / 10000
    : null

  useEffect(() => {
    if (prixUnitaireCalcule !== null) {
      setValue('prixAchatHT', prixUnitaireCalcule, { shouldValidate: false })
    }
  }, [prixUnitaireCalcule, setValue])

  const handleSeuils = useCallback((alerte: number, tension: number) => {
    setValue('stockAlerte',  alerte)
    setValue('stockTension', tension)
  }, [setValue])

  // â”€â”€ TVA : facteur de conversion selon le rayon sÃ©lectionnÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const selectedRayon = rayons.find(r => r.id === selectedRayonId)
  const tauxTVA       = franchiseTVA ? 0 : Number(selectedRayon?.tauxTVA ?? 20)
  const facteurTVA    = 1 + tauxTVA / 100

  // Initialiser le TTC quand on ouvre le formulaire ou quand le rayon change
  useEffect(() => {
    const ht = Number(watchPrixHT)
    if (!isNaN(ht) && ht > 0) {
      setPrixTTC((ht * facteurTVA).toFixed(2))
    }
  }, [facteurTVA]) // recalcule si rayon change ou franchiseTVA change

  // Initialisation une seule fois depuis l'article existant
  useEffect(() => {
    if (!ttcInitialized.current && article?.prixVenteHT) {
      const ht = Number(article.prixVenteHT)
      setPrixTTC((ht * facteurTVA).toFixed(2))
      ttcInitialized.current = true
    }
  }, [article, facteurTVA])

  function onHTBlur(e: React.FocusEvent<HTMLInputElement>) {
    const ht = parseFloat(e.target.value.replace(',', '.'))
    if (!isNaN(ht) && ht >= 0) setPrixTTC((ht * facteurTVA).toFixed(2))
  }

  function onTTCChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPrixTTC(e.target.value)
  }

  function onTTCBlur(e: React.FocusEvent<HTMLInputElement>) {
    const ttc = parseFloat(e.target.value.replace(',', '.'))
    if (!isNaN(ttc) && ttc >= 0) {
      const ht = facteurTVA > 0 ? Math.round((ttc / facteurTVA) * 10000) / 10000 : ttc
      setValue('prixVenteHT', ht, { shouldValidate: true })
      setPrixTTC(ttc.toFixed(2))
    }
  }

  // Remplir les champs custom quand les valeurs chargent (mode Ã©dition)
  useEffect(() => {
    if (isEdit && Object.keys(customValues).length > 0) {
      Object.entries(customValues).forEach(([defId, val]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue(`custom_${defId}` as any, val ?? '')
      })
    }
  }, [customValues, isEdit, setValue])
  const isLibrairie = selectedRayon?.isLibrairie ?? false
  const categories  = selectedRayon?.categories ?? []

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
      imprimeurId:     values.imprimeurId || null,
    }
    const entityId = isEdit ? article!.id : generateUUID()
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

      {/* â”€â”€ Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <option value="">â€” Choisir â€”</option>
              {rayons.map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
            {errors.rayonId && <span className={styles.error}>{errors.rayonId.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="categorieId">CatÃ©gorie</label>
            <select
              id="categorieId"
              className={styles.select}
              disabled={categories.length === 0}
              {...register('categorieId')}
            >
              <option value="">â€” Aucune â€”</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* â”€â”€ Informations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            <label className={styles.label} htmlFor="reference">RÃ©fÃ©rence</label>
            <input id="reference" className={styles.input} {...register('reference')} placeholder="SKU, code interneâ€¦" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="imageUrl">Image (URL)</label>
            <input id="imageUrl" className={styles.input} {...register('imageUrl')} placeholder="https://â€¦" />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">Description</label>
          <textarea id="description" className={styles.textarea} rows={3} {...register('description')} />
        </div>
      </div>

      {/* â”€â”€ Tarification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>
          Tarification
          {selectedRayon && (
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-soft)', textTransform: 'none', letterSpacing: 0 }}>
              â€” TVA {franchiseTVA ? 'non applicable (293 B CGI)' : `${tauxTVA} %`}
            </span>
          )}
        </p>

        {/* Prix de vente : double saisie HT â†” TTC */}
        <div className={styles.prixVenteRow}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label} htmlFor="prixVenteHT">
              {franchiseTVA ? 'Prix de vente' : `Prix vente HT`} <span className={styles.req}>*</span>
            </label>
            <div className={styles.inputWithUnit}>
              <input
                id="prixVenteHT"
                className={`${styles.input} ${errors.prixVenteHT ? styles.inputError : ''}`}
                inputMode="decimal"
                placeholder="0.00"
                {...register('prixVenteHT', { onBlur: onHTBlur })}
              />
              <span className={styles.unit}>â‚¬</span>
            </div>
            {errors.prixVenteHT && <span className={styles.error}>{errors.prixVenteHT.message}</span>}
          </div>

          <div className={styles.prixArrow} title={franchiseTVA ? 'TVA non applicable' : `TVA ${tauxTVA} %`}>
            {franchiseTVA ? '=' : 'â†”'}
          </div>

          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label} htmlFor="prixVenteTTC">
              Prix vente TTC {franchiseTVA && <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>(TVA non applicable)</span>}
            </label>
            <div className={styles.inputWithUnit}>
              <input
                id="prixVenteTTC"
                className={styles.input}
                inputMode="decimal"
                placeholder="0.00"
                value={prixTTC}
                onChange={onTTCChange}
                onBlur={onTTCBlur}
                readOnly={franchiseTVA}
                style={franchiseTVA ? { background: 'var(--cream)', color: 'var(--text-soft)' } : {}}
              />
              <span className={styles.unit}>â‚¬</span>
            </div>
          </div>
        </div>

        {/* Achat : lot en premier â†’ prix unitaire dÃ©rivÃ© ou saisie directe */}
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatLotHT">Prix lot HT</label>
            <div className={styles.inputWithUnit}>
              <input id="prixAchatLotHT" className={styles.input} inputMode="decimal" placeholder="0.00" {...register('prixAchatLotHT')} />
              <span className={styles.unit}>â‚¬</span>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatLotQte">QtÃ© par lot</label>
            <input id="prixAchatLotQte" className={styles.input} inputMode="numeric" placeholder="ex : 5" {...register('prixAchatLotQte')} />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="prixAchatHT">
              Prix d'achat unitaire HT
              {lotValide && (
                <span className={styles.calcBadge}>ðŸ”¢ calculÃ© depuis le lot</span>
              )}
            </label>
            <div className={styles.inputWithUnit}>
              <input
                id="prixAchatHT"
                className={styles.input}
                inputMode="decimal"
                placeholder="0.00"
                readOnly={lotValide}
                style={lotValide ? { background: 'var(--cream)', color: 'var(--text-soft)', cursor: 'not-allowed' } : {}}
                {...register('prixAchatHT')}
              />
              <span className={styles.unit}>â‚¬</span>
            </div>
            {lotValide && prixUnitaireCalcule !== null && (
              <p className={styles.calcHint}>
                {Number(watchLotHT).toFixed(2)} â‚¬ Ã· {watchLotQte} = {prixUnitaireCalcule.toFixed(4)} â‚¬ / unitÃ©
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="stock">Stock initial</label>
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

      {/* â”€â”€ Librairie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isLibrairie && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Librairie</p>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="isbn">ISBN</label>
              <input id="isbn" className={styles.input} {...register('isbn')} placeholder="978-â€¦" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="datePublication">Date de publication</label>
              <input id="datePublication" type="date" className={styles.input} {...register('datePublication')} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Auteur{!reseauOnly ? 's' : ''}</label>
            {reseauOnly ? (
              /* Auto-Ã©dition : auteur virtuel assignÃ© automatiquement */
              <div className={styles.auteurVirtuel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--sage)' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span className={styles.auteurVirtuelNom}>{tenant?.name ?? 'Votre maison d\'Ã©dition'}</span>
                <span className={styles.auteurVirtuelBadge}>Auteur assignÃ© automatiquement</span>
              </div>
            ) : (
              <>
                <input
                  className={styles.auteurSearch}
                  placeholder="Rechercher un auteurâ€¦"
                  value={auteurSearch}
                  onChange={(e) => setAuteurSearch(e.target.value)}
                />
                <div className={styles.auteurList}>
                  {filteredAuteurs.length === 0 && (
                    <p className={styles.auteurEmpty}>Aucun auteur trouvÃ©.</p>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ Impression â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {imprimeurs.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Impression</p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="imprimeurId">Imprimeur</label>
            <select id="imprimeurId" className={styles.select} {...register('imprimeurId')}>
              <option value="">â€” Aucun â€”</option>
              {imprimeurs.map(imp => (
                <option key={imp.id} value={imp.id}>{imp.nom}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* â”€â”€ Champs custom du rayon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedRayonId && (
        <CustomFieldsRenderer rayonId={selectedRayonId} register={register} errors={errors} />
      )}

      {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez rÃ©essayer.</p>}

      {/* â”€â”€ Statut catalogue (mode Ã©dition uniquement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              {article.actif ? 'Article en catalogue' : 'Article retirÃ© du catalogue'}
            </span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', margin: '2px 0 0' }}>
              {article.actif
                ? 'Visible dans les ventes et le catalogue.'
                : 'ConservÃ© en base pour l\'historique. Non disponible Ã  la vente.'}
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
            {setActif.isPending ? 'â€¦' : article.actif ? 'Retirer du catalogue' : 'Remettre au catalogue'}
          </button>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
        <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrementâ€¦' : isEdit ? 'Enregistrer' : 'CrÃ©er l\'article'}
        </button>
      </div>
    </form>
  )
}




