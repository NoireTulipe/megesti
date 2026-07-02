import { generateUUID } from '@/lib/utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateArticle, useUpdateArticle, useSetArticleActif } from './hooks/useArticles'
import { useRayons } from './hooks/useRayons'
import { useAuteurs } from '../auteurs/hooks/useAuteurs'
import { useImprimeurs } from '../imprimeurs/hooks/useImprimeurs'
import { useCustomFieldsByRayon } from '@/features/reglages/hooks/useCustomFields'
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/features/reglages/hooks/useCustomFieldValues'
import { CustomFieldsRenderer } from '@/components/CustomFieldsRenderer'
import { validateCustomFields } from '@/lib/customFieldValidation'
import { DualRangeSlider } from '@/components/DualRangeSlider'
import { DateField } from '@/components/DateInput'
import { useFranchiseTVA } from '@/hooks/useFranchiseTVA'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { useMonTenant } from '@/features/reglages/hooks/useMonTenant'
import { api, getImageUrl } from '@/lib/api'
import { fetchBnfIsbn, type BnfLivreInfo } from './hooks/useBnfLookup'
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
  prixVenteHT:     z.coerce.number({ invalid_type_error: 'Nombre requis' }).min(0, 'Doit être … 0'),
  prixAchatHT:     optNum,
  prixAchatLotHT:  optNum,
  prixAchatLotQte: optInt,
  stock:           z.coerce.number().int().min(0).default(0),
  stockAlerte:     z.coerce.number().int().min(0).default(0),
  stockTension:    z.coerce.number().int().min(0).default(0),
  isbn:            z.string().regex(/^[\dX]*$/i, 'ISBN invalide — chiffres uniquement').optional(),
  datePublication: z.string().optional(),
  imprimeurId:     z.string().optional().nullable(),
  vendable:        z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose:  () => void
  article?: Article
}

export function ArticleForm({ onClose, article }: Props) {
  const isEdit          = Boolean(article)
  const qc              = useQueryClient()
  const createArticle   = useCreateArticle()
  const updateArticle   = useUpdateArticle()
  const setActif        = useSetArticleActif()
  const saveCustomValues = useSaveCustomFieldValues()
  const { data: rayons = [] }      = useRayons()
  const { data: allAuteurs = [] }  = useAuteurs()
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

  // Image — état local unifié (création + édition)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(article?.imageUrl ?? null)
  const [pendingFile,    setPendingFile]    = useState<File | null>(null)
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null)
  const [deleteImage,    setDeleteImage]    = useState(false)
  const [uploadError,    setUploadError]    = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'rayon' | 'isbn' | 'details'>(isEdit ? 'details' : 'rayon')

  const [bnfLoading,  setBnfLoading]  = useState(false)
  const [bnfResult,   setBnfResult]   = useState<BnfLivreInfo | null>(null)
  const [bnfNotFound, setBnfNotFound] = useState(false)
  const [bnfFetchErr, setBnfFetchErr] = useState(false)
  const [bnfApplied,  setBnfApplied]  = useState(false)
  const [bnfImageUrl, setBnfImageUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setDeleteImage(false)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDeleteImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
    setCurrentImageUrl(null)
    setDeleteImage(true)
  }

  const displayImage = previewUrl ?? (currentImageUrl ? getImageUrl(currentImageUrl) : null)

  const { register, handleSubmit, control, setValue, getValues, setError, clearErrors,
          formState: { errors, isSubmitting } } = useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: article ? {
        rayonId:         article.rayonId,
        categorieId:     article.categorieId ?? undefined,
        nom:             article.nom,
        reference:       article.reference ?? '',
        description:     article.description ?? '',
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
        vendable:        article.vendable,
      } : { stock: 0, vendable: true },
    })

  const selectedRayonId    = useWatch({ control, name: 'rayonId' })
  const watchVendable      = useWatch({ control, name: 'vendable', defaultValue: article?.vendable ?? true })
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

  // •"?•"? TVA : facteur de conversion selon le rayon sélectionné •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?
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

  async function handleBnfLookup() {
    const isbn = (getValues('isbn') ?? '').trim().replace(/[-\s]/g, '')
    if (!isbn) return
    setBnfLoading(true)
    setBnfResult(null)
    setBnfNotFound(false)
    setBnfFetchErr(false)
    setBnfApplied(false)
    try {
      const info = await fetchBnfIsbn(isbn)
      if (!info) setBnfNotFound(true)
      else setBnfResult(info)
    } catch {
      setBnfFetchErr(true)
    } finally {
      setBnfLoading(false)
    }
  }

  function handleApplyBnf(info: BnfLivreInfo) {
    setValue('nom', info.titre, { shouldValidate: true })
    if (info.resume)           setValue('description', info.resume)
    if (info.anneePublication) setValue('datePublication', `${info.anneePublication}-01-01`)
    if (info.prixVenteHT !== null) {
      setValue('prixVenteHT', info.prixVenteHT, { shouldValidate: true })
      setPrixTTC(info.prixTTC !== null ? info.prixTTC.toFixed(2) : (info.prixVenteHT * facteurTVA).toFixed(2))
    }
    if (info.imageUrl) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPendingFile(null)
      setCurrentImageUrl(info.imageUrl)
      setBnfImageUrl(info.imageUrl)
      setDeleteImage(false)
    }
    setBnfApplied(true)
  }

  function handleIsbnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); void handleBnfLookup() }
  }

  function handleIsbnInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/[-\s]/g, '').replace(/[^0-9Xx]/g, '').toUpperCase()
    e.target.value = cleaned
    void register('isbn').onChange(e)
  }

  // Remplir les champs custom quand les valeurs chargent (mode édition)
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
      reference:       values.reference   || null,
      description:     values.description || null,
      prixVenteHT:     values.vendable ? values.prixVenteHT : 0,
      vendable:        values.vendable,
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
    const fullPayload = {
      ...payload,
      ...(deleteImage                                 ? { imageUrl: null        } : {}),
      ...(!deleteImage && !pendingFile && bnfImageUrl ? { imageUrl: bnfImageUrl } : {}),
    }
    if (isEdit) {
      await updateArticle.mutateAsync({ id: entityId, ...fullPayload })
    } else {
      await createArticle.mutateAsync({ id: entityId, ...fullPayload })
    }

    // Upload de l'image en attente (après création pour avoir l'ID en base)
    if (pendingFile) {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', pendingFile)
      try {
        await api.upload<{ thumbWebUrl: string }>(`/articles/${entityId}/image`, formData)
        await qc.invalidateQueries({ queryKey: ['articles'] })
      } catch {
        setUploadingImage(false)
        setUploadError("L'article a été sauvegardé mais l'image n'a pas pu être uploadée. Réessayez depuis la fiche.")
        return
      }
      setUploadingImage(false)
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

  const bnfCard = bnfResult && (
    <div className={styles.bnfCard}>
      {bnfResult.imageUrl && (
        <img src={bnfResult.imageUrl} alt={bnfResult.titre} className={styles.bnfCover} />
      )}
      <div className={styles.bnfCardBody}>
        <p className={styles.bnfTitre}>{bnfResult.titre}</p>
        {bnfResult.auteursMention && <p className={styles.bnfMeta}>{bnfResult.auteursMention}</p>}
        {(bnfResult.editeur || bnfResult.anneePublication) && (
          <p className={styles.bnfMeta}>
            {[bnfResult.editeur, bnfResult.anneePublication].filter(Boolean).join(' · ')}
          </p>
        )}
        {bnfResult.collection && (
          <p className={styles.bnfMeta}>
            Collection : {bnfResult.collection}{bnfResult.collectionVolume ? `, vol. ${bnfResult.collectionVolume}` : ''}
          </p>
        )}
        {(bnfResult.prixTTC !== null || bnfResult.prixVenteHT !== null) && (
          <p className={styles.bnfPrix}>
            {bnfResult.prixTTC !== null && `${bnfResult.prixTTC.toFixed(2)} € TTC`}
            {bnfResult.prixVenteHT !== null && ` → ${bnfResult.prixVenteHT.toFixed(2)} € HT`}
          </p>
        )}
        {bnfResult.resume && (
          <p className={styles.bnfResume}>
            {bnfResult.resume.length > 240 ? `${bnfResult.resume.slice(0, 240)}…` : bnfResult.resume}
          </p>
        )}
        <button
          type="button"
          className={`${styles.bnfApplyBtn} ${bnfApplied ? styles.bnfApplied : ''}`}
          onClick={() => handleApplyBnf(bnfResult!)}
          disabled={bnfApplied}
        >
          {bnfApplied ? '✓ Données appliquées' : 'Utiliser ces données'}
        </button>
      </div>
    </div>
  )

  const bnfFeedback = (
    <>
      {bnfNotFound && <p className={styles.bnfMsg}>Cet ISBN n'est pas encore référencé dans le catalogue BNF — vous pouvez créer la fiche et vérifier le dépôt légal plus tard.</p>}
      {bnfFetchErr  && <p className={`${styles.bnfMsg} ${styles.bnfMsgError}`}>Impossible de joindre le catalogue BNF — la fiche peut être enregistrée et le dépôt légal vérifié ultérieurement.</p>}
      {bnfCard}
    </>
  )

  const bnfSearchRow = (
    <div className={styles.isbnSearchRow}>
      <input
        id="isbn"
        className={styles.input}
        {...register('isbn')}
        onChange={handleIsbnInputChange}
        onKeyDown={handleIsbnKeyDown}
        placeholder="9782…"
        maxLength={13}
        inputMode="numeric"
      />
      <button
        type="button"
        className={styles.bnfSearchBtn}
        onClick={() => void handleBnfLookup()}
        disabled={bnfLoading}
      >
        {bnfLoading
          ? <svg className={styles.bnfSpinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          : 'Vérifier BNF'}
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

      {/* •"?•"? Classification •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {/* ── Étape 1 : Rayon ── */}
      {!isEdit && step === 'rayon' && (
        <div className={styles.stepRayon}>
          <p className={styles.stepRayonTitle}>Dans quel rayon ?</p>
          <select
            id="rayonId"
            className={`${styles.select} ${errors.rayonId ? styles.inputError : ''}`}
            {...rayonRegister}
            onChange={(e) => { rayonRegister.onChange(e); setValue('categorieId', undefined) }}
          >
            <option value="">— Choisir un rayon —</option>
            {rayons.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
          {errors.rayonId && <span className={styles.error}>{errors.rayonId.message}</span>}
          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Annuler</button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!selectedRayonId}
              onClick={() => isLibrairie ? setStep('isbn') : setStep('details')}
            >
              Continuer →
            </button>
          </div>
        </div>
      )}

      {/* ── Étape 2 : ISBN / BNF ── */}
      {!isEdit && step === 'isbn' && (
        <>
          <div className={styles.isbnStep}>
            <div className={styles.isbnStepIcon}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <p className={styles.isbnStepTitle}>Quel est l'ISBN de ce livre ?</p>
            <p className={styles.isbnStepSub}>Code-barre à 13 chiffres au dos de la couverture.</p>
            {bnfSearchRow}
            {bnfFeedback}
            <button type="button" className={styles.skipIsbnBtn} onClick={() => setStep('details')}>
              Je ne connais pas l'ISBN →
            </button>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setStep('rayon')}>← Retour</button>
            <button type="button" className={styles.btnPrimary} onClick={() => setStep('details')}>
              {bnfApplied ? 'Continuer avec ces données' : 'Continuer sans'}
            </button>
          </div>
        </>
      )}

      {/* ── Étape 3 : Détails (ou formulaire complet en édition) ── */}
      {(isEdit || step === 'details') && (
        <>
          {/* Récapitulatif des étapes précédentes */}
          {!isEdit && (
            <div className={styles.stepSummary}>
              <span className={styles.stepSummaryChip}>{selectedRayon?.nom ?? '—'}</span>
              {getValues('isbn') && (
                <span className={styles.stepSummaryChip}>
                  ISBN {getValues('isbn')}
                  {bnfApplied && <span className={styles.bnfBadge}>BNF</span>}
                </span>
              )}
              <button type="button" className={styles.stepSummaryEdit} onClick={() => setStep(isLibrairie ? 'isbn' : 'rayon')}>
                Modifier
              </button>
            </div>
          )}

          {/* Classification */}
          {isEdit ? (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Classification</p>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rayonId">Rayon <span className={styles.req}>*</span></label>
                  <select
                    id="rayonId"
                    className={`${styles.select} ${errors.rayonId ? styles.inputError : ''}`}
                    {...rayonRegister}
                    onChange={(e) => { rayonRegister.onChange(e); setValue('categorieId', undefined) }}
                  >
                    <option value="">— Choisir —</option>
                    {rayons.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                  {errors.rayonId && <span className={styles.error}>{errors.rayonId.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="categorieId">Catégorie</label>
                  <select id="categorieId" className={styles.select} disabled={categories.length === 0} {...register('categorieId')}>
                    <option value="">— Aucune —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : categories.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="categorieId">Catégorie</label>
                <select id="categorieId" className={styles.select} {...register('categorieId')}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>
          ) : null}

          {/* Informations */}
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
              />
              {errors.nom && <span className={styles.error}>{errors.nom.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reference">Référence</label>
              <input id="reference" className={styles.input} {...register('reference')} placeholder="SKU, code interne…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Image</label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
              {displayImage ? (
                <div className={styles.imagePreviewWrap}>
                  <img src={displayImage} alt="Illustration" className={styles.imagePreview} />
                  <div className={styles.imageActions}>
                    {pendingFile && <span className={styles.imagePendingBadge}>Sera sauvegardée à la validation</span>}
                    <button type="button" className={styles.imageBtn} onClick={() => fileInputRef.current?.click()}>Remplacer</button>
                    <button type="button" className={`${styles.imageBtn} ${styles.imageBtnDelete}`} onClick={handleDeleteImage}>Supprimer</button>
                  </div>
                </div>
              ) : (
                <button type="button" className={styles.imageUploadZone} onClick={() => fileInputRef.current?.click()}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Ajouter une image</span>
                  <span className={styles.imageUploadHint}>JPG, PNG ou WebP · max 10 Mo</span>
                </button>
              )}
              {uploadError && <span className={styles.error}>{uploadError}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">Description</label>
              <textarea id="description" className={styles.textarea} rows={3} {...register('description')} />
            </div>
          </div>

      {/* •"?•"? Tarification •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
          {/* Tarification */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              Tarification
              {selectedRayon && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-soft)', textTransform: 'none', letterSpacing: 0 }}>
                  — TVA {franchiseTVA ? 'non applicable (293 B CGI)' : `${tauxTVA} %`}
                </span>
              )}
            </p>
            {/* Matière première : stock géré mais jamais proposée à la vente */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={!watchVendable}
                onChange={(e) => setValue('vendable', !e.target.checked, { shouldDirty: true })}
                style={{ width: 16, height: 16, accentColor: 'var(--mauve)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
                Matière première <span style={{ color: 'var(--text-soft)' }}>(papier, encre… — stock suivi, jamais vendable en caisse ni en dépôt)</span>
              </span>
            </label>
            <div className={styles.prixVenteRow} style={!watchVendable ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="prixVenteHT">
                  {franchiseTVA ? 'Prix de vente' : 'Prix vente HT'} {watchVendable && <span className={styles.req}>*</span>}
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    id="prixVenteHT"
                    className={`${styles.input} ${errors.prixVenteHT ? styles.inputError : ''}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={!watchVendable}
                    {...register('prixVenteHT', { onBlur: onHTBlur })}
                  />
                  <span className={styles.unit}>€</span>
                </div>
                {errors.prixVenteHT && <span className={styles.error}>{errors.prixVenteHT.message}</span>}
              </div>
              <div className={styles.prixArrow} title={franchiseTVA ? 'TVA non applicable' : `TVA ${tauxTVA} %`}>
                {franchiseTVA ? '=' : '—'}
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
                  <span className={styles.unit}>€</span>
                </div>
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="prixAchatLotHT">{franchiseTVA ? 'Prix lot' : 'Prix lot HT'}</label>
                <div className={styles.inputWithUnit}>
                  <input id="prixAchatLotHT" className={styles.input} inputMode="decimal" placeholder="0.00" {...register('prixAchatLotHT')} />
                  <span className={styles.unit}>€</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="prixAchatLotQte">Qté par lot</label>
                <input id="prixAchatLotQte" className={styles.input} inputMode="numeric" placeholder="ex : 5" {...register('prixAchatLotQte')} />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="prixAchatHT">
                  Prix d'achat unitaire HT
                  {lotValide && <span className={styles.calcBadge}>⚡ calculé depuis le lot</span>}
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
                  <span className={styles.unit}>€</span>
                </div>
                {lotValide && prixUnitaireCalcule !== null && (
                  <p className={styles.calcHint}>
                    {Number(watchLotHT).toFixed(2)} € ÷ {watchLotQte} = {prixUnitaireCalcule.toFixed(4)} € / unité
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

          {/* Librairie */}
          {isLibrairie && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Librairie</p>
              {isEdit ? (
                <>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="isbn">ISBN</label>
                    {bnfSearchRow}
                  </div>
                  {bnfFeedback}
                </>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="isbn">ISBN</label>
                  <input id="isbn" className={styles.input} {...register('isbn')} onChange={handleIsbnInputChange} placeholder="9782…" maxLength={13} inputMode="numeric" />
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="datePublication">Date de publication</label>
                <DateField id="datePublication" className={styles.input} {...register('datePublication')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Auteur{!reseauOnly ? 's' : ''}</label>
                {reseauOnly ? (
                  <div className={styles.auteurVirtuel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--sage)' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span className={styles.auteurVirtuelNom}>{tenant?.name ?? "Votre maison d'édition"}</span>
                    <span className={styles.auteurVirtuelBadge}>Auteur assigné automatiquement</span>
                  </div>
                ) : (
                  <>
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
                            <input type="checkbox" className={styles.auteurCheck} checked={selected} onChange={() => toggleAuteur(a.id)} />
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

          {/* Impression */}
          {imprimeurs.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Impression</p>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="imprimeurId">Imprimeur</label>
                <select id="imprimeurId" className={styles.select} {...register('imprimeurId')}>
                  <option value="">— Aucun —</option>
                  {imprimeurs.map(imp => <option key={imp.id} value={imp.id}>{imp.nom}</option>)}
                </select>
              </div>
            </div>
          )}

          {selectedRayonId && (
            <CustomFieldsRenderer rayonId={selectedRayonId} register={register} errors={errors} />
          )}

          {isError && <p className={styles.errorGlobal}>Une erreur est survenue. Veuillez réessayer.</p>}

          {isEdit && article && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
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
                    : "Conservé en base pour l'historique. Non disponible à la vente."}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => { await setActif.mutateAsync({ id: article.id, actif: !article.actif }); onClose() }}
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

          {uploadingImage && (
            <div className={styles.uploadBanner}>
              <svg className={styles.uploadBannerSpinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span><em className={styles.uploadBannerName}>MeGesti</em> enregistre votre image…</span>
            </div>
          )}

          <div className={styles.actions}>
            {isEdit
              ? <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>Annuler</button>
              : <button type="button" className={styles.btnSecondary} onClick={() => setStep(isLibrairie ? 'isbn' : 'rayon')}>← Retour</button>
            }
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {uploadingImage ? 'Image en cours…' : isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'article"}
            </button>
          </div>
        </>
      )}

    </form>
  )
}
