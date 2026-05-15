import { generateUUID } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BuilderSection } from './BuilderSection'
import type { CanvasSection, BuilderField as BField } from './types'
import { FIXED_SECTIONS, ARTICLE_FIXED_FIELDS, ARTICLE_LIBRAIRE_FIELDS } from '@/lib/fixedSections'
import { getFormWidth, setFormWidth } from '@/lib/formWidth'
import {
  useCustomFields, useCustomFieldsByRayon,
  useCreateCustomField, useUpdateCustomField, useDeleteCustomField,
} from '@/features/reglages/hooks/useCustomFields'
import type { EntityType, FieldType } from '@megesti/shared'
import type { CustomFieldDef, UpdateCustomFieldPayload } from '@/features/reglages/hooks/useCustomFields'
import styles from './FormBuilder.module.css'

// Discriminated union : soit entityType, soit rayonId
type Props =
  | { entityType: EntityType; rayonId?: never; isLibrairie?: never }
  | { rayonId: string;        entityType?: never; isLibrairie?: boolean }

function buildCanvas(champs: CustomFieldDef[], entityType?: EntityType): CanvasSection[] {
  const fixedSects  = entityType ? (FIXED_SECTIONS[entityType] ?? []) : []
  const fixedLabels = new Set(fixedSects.map((s) => s.label))

  const byCategory = new Map<string, CustomFieldDef[]>()
  for (const c of champs) {
    const key = c.category ?? '__none__'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(c)
  }

  const toBuilderField = (c: CustomFieldDef): BField => ({
    id: c.id, labelFr: c.labelFr, fieldType: c.fieldType as FieldType,
    required: c.required, thesaurusId: c.thesaurusId,
    options: c.options as BField['options'], halfWidth: c.halfWidth,
    placeholder: c.placeholder, validation: c.validation,
  })

  const result: CanvasSection[] = []

  for (const fs of fixedSects) {
    result.push({
      id: fs.id, label: fs.label, isFixed: true,
      fixedFields: fs.fields,
      fields: (byCategory.get(fs.label) ?? []).map(toBuilderField),
    })
  }

  for (const [category, fields] of byCategory) {
    if (category === '__none__' || fixedLabels.has(category)) continue
    result.push({
      id: category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || category,
      label: category, isFixed: false, fixedFields: [],
      fields: fields.map(toBuilderField),
    })
  }

  const uncategorized = byCategory.get('__none__') ?? []
  if (uncategorized.length > 0) {
    result.push({
      id: '_sans_categorie', label: 'Sans catégorie',
      isFixed: false, fixedFields: [],
      fields: uncategorized.map(toBuilderField),
    })
  }

  return result
}

export function FormBuilder({ entityType, rayonId, isLibrairie }: Props) {
  // Hooks toujours appelés dans le même ordre — on désactive celui qui ne sert pas
  const { data: entityChamps } = useCustomFields(
    entityType ?? 'auteur', { enabled: !!entityType }
  )
  const { data: rayonChamps } = useCustomFieldsByRayon(
    rayonId ?? '', { enabled: !!rayonId }
  )
  const champs = entityType ? (entityChamps ?? []) : (rayonChamps ?? [])

  const createChamp = useCreateCustomField()
  const updateChamp = useUpdateCustomField()
  const deleteChamp = useDeleteCustomField()

  const [sections, setSections]             = useState<CanvasSection[]>([])
  const [activeId, setActiveId]             = useState<string | null>(null)
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [canvasWidth, setCanvasWidth]       = useState(() => {
    const key = entityType ?? `rayon-${rayonId}`
    return getFormWidth(key as EntityType) ?? 760
  })
  const resizingRef     = useRef(false)
  const crossSectionRef = useRef<{ fieldId: string; toSection: string } | null>(null)

  useEffect(() => {
    const resolved = entityType ? (entityChamps ?? []) : (rayonChamps ?? [])
    setSections(buildCanvas(resolved, entityType))
  }, [entityChamps, rayonChamps, entityType, rayonId])

  const isSaving = createChamp.isPending || updateChamp.isPending || deleteChamp.isPending

  // •"?•"? Width •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

  const widthKey = (entityType ?? `rayon-${rayonId}`) as EntityType

  function handleWidthChange(w: number) {
    setCanvasWidth(w)
    setFormWidth(widthKey, w)
  }

  function startResize(e: React.MouseEvent) {
    resizingRef.current = true
    const startX = e.clientX, startW = canvasWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      setCanvasWidth(Math.max(320, Math.min(startW + ev.clientX - startX, 1400)))
    }
    const onUp = (ev: MouseEvent) => {
      resizingRef.current = false
      setFormWidth(widthKey, Math.max(320, Math.min(startW + ev.clientX - startX, 1400)))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // •"?•"? Sections •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

  function handleAddSection() {
    const name = newSectionName.trim() || 'Nouvelle section'
    const id   = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `section-${Date.now()}`
    if (sections.find((s) => s.id === id)) return
    setSections((prev) => [...prev, { id, label: name, isFixed: false, fixedFields: [], fields: [] }])
    setNewSectionName('')
    setShowNewSection(false)
  }

  async function handleSectionRename(id: string, newLabel: string): Promise<void> {
    const section = sections.find((s) => s.id === id)
    if (!section) return
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, label: newLabel } : s))
    await Promise.all(
      section.fields.map((f) => updateChamp.mutateAsync({ id: f.id, category: newLabel }))
    )
  }

  async function handleSectionDelete(id: string): Promise<void> {
    const section = sections.find((s) => s.id === id)
    if (!section) return
    setSections((prev) => prev.filter((s) => s.id !== id))
    await Promise.all(section.fields.map((f) => deleteChamp.mutateAsync(f.id)))
  }

  // •"?•"? Fields •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

  async function handleAddField(sectionId: string, fieldType: FieldType, labelFr: string): Promise<void> {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    const id       = generateUUID()
    const category = section.label === 'Sans catégorie' ? null : section.label
    const position = section.fields.length

    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : {
        ...s,
        fields: [...s.fields, {
          id, labelFr, fieldType, required: false,
          thesaurusId: null, options: null, halfWidth: false, placeholder: null,
        }],
      }
    ))

    await createChamp.mutateAsync({
      id, entityType: entityType ?? null, rayonId: rayonId ?? null,
      label: { fr: labelFr }, fieldType, position, required: false,
      category, thesaurusId: null, options: null,
    })
  }

  function handleFieldUpdate(sectionId: string, fieldId: string, patch: Partial<BField>): void {
    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : {
        ...s, fields: s.fields.map((f) => f.id === fieldId ? { ...f, ...patch } : f),
      }
    ))
    const dbPatch: UpdateCustomFieldPayload = { id: fieldId }
    if (patch.labelFr     !== undefined) dbPatch.labelFr     = patch.labelFr
    if (patch.required    !== undefined) dbPatch.required    = patch.required
    if (patch.halfWidth   !== undefined) dbPatch.halfWidth   = patch.halfWidth
    if (patch.placeholder !== undefined) dbPatch.placeholder = patch.placeholder
    if (patch.validation  !== undefined) dbPatch.validation  = patch.validation
    if (Object.keys(dbPatch).length > 1) updateChamp.mutate(dbPatch)
  }

  async function handleFieldDelete(sectionId: string, fieldId: string): Promise<void> {
    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
    ))
    await deleteChamp.mutateAsync(fieldId)
  }

  // •"?•"? DnD •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    crossSectionRef.current = null
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const aStr = active.id as string, oStr = over.id as string
    if (!aStr.startsWith('field::')) return
    const [, aSectionId, aFieldId] = aStr.split('::')
    const targetId = oStr.startsWith('field::')   ? oStr.split('::')[1]
                   : oStr.startsWith('section::') ? oStr.split('::')[1] : null
    if (!targetId || aSectionId === targetId) return
    crossSectionRef.current = { fieldId: aFieldId, toSection: targetId }
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, fields: [...s.fields] }))
      const from = next.find((s) => s.id === aSectionId)
      const to   = next.find((s) => s.id === targetId)
      if (!from || !to) return prev
      const idx = from.fields.findIndex((f) => f.id === aFieldId)
      if (idx < 0) return prev
      const [moved] = from.fields.splice(idx, 1)
      to.fields.push(moved)
      return next
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) { crossSectionRef.current = null; return }
    const aStr = active.id as string, oStr = over.id as string

    if (aStr.startsWith('section::') && oStr.startsWith('section::')) {
      const fi = sections.findIndex((s) => `section::${s.id}` === aStr)
      const ti = sections.findIndex((s) => `section::${s.id}` === oStr)
      if (fi >= 0 && ti >= 0) setSections((p) => arrayMove(p, fi, ti))
      return
    }

    if (crossSectionRef.current) {
      const { fieldId, toSection } = crossSectionRef.current
      crossSectionRef.current = null
      const toSect = sections.find((s) => s.id === toSection)
      if (toSect) {
        const newCategory = toSect.label === 'Sans catégorie' ? null : toSect.label
        updateChamp.mutate({ id: fieldId, category: newCategory })
        toSect.fields.forEach((f, i) => updateChamp.mutate({ id: f.id, position: i }))
      }
      return
    }

    if (aStr.startsWith('field::') && oStr.startsWith('field::')) {
      const [, aSectionId, aFieldId] = aStr.split('::')
      const [, , oFieldId]           = oStr.split('::')
      let reordered: BField[] = []
      setSections((prev) => prev.map((s) => {
        if (s.id !== aSectionId) return s
        const fi = s.fields.findIndex((f) => f.id === aFieldId)
        const ti = s.fields.findIndex((f) => f.id === oFieldId)
        reordered = arrayMove(s.fields, fi, ti)
        return { ...s, fields: reordered }
      }))
      reordered.forEach((f, i) => updateChamp.mutate({ id: f.id, position: i }))
    }
  }

  // •"?•"? Render •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?

  function getActiveLabel(): string | null {
    if (!activeId) return null
    if (activeId.startsWith('section::'))
      return sections.find((s) => `section::${s.id}` === activeId)?.label ?? null
    const [, sId, fId] = activeId.split('::')
    return sections.find((s) => s.id === sId)?.fields.find((f) => f.id === fId)?.labelFr ?? null
  }

  const allSectionIds = sections.map((s) => `section::${s.id}`)
  const activeLabel   = getActiveLabel()
  const isActiveField = activeId?.startsWith('field::') ?? false

  return (
    <div className={styles.page}>

      {/* •"?•"? Toolbar •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.toolbar}>
        <div className={styles.widthControl}>
          <span className={styles.widthLabel}>Aperçu : {canvasWidth}px</span>
          <input
            type="range" min={320} max={1400} value={canvasWidth}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className={styles.widthSlider}
          />
        </div>
        <div className={styles.toolbarRight}>
          {isSaving
            ? <span className={styles.saving}>Enregistrement…</span>
            : <span className={styles.hint}>Glisser · Double-cliquer pour renommer</span>
          }
          <button className={styles.btnAddSection} onClick={() => setShowNewSection((v) => !v)}>
            + Section
          </button>
        </div>
      </div>

      {/* •"?•"? Champs fixes article (mode rayon) •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {rayonId && (
        <div className={styles.systemNotice}>
          <span className={styles.systemNoticeIcon}>•"•</span>
          <div>
            <strong>Champs système de l'article</strong> — toujours présents :
            {' '}Nom, Référence, Prix vente HT, Prix achat HT, Prix lot HT / Qté lot, Stock, Description, Image
            {isLibrairie && <> · <em>Librairie :</em> ISBN, Date de publication, Auteurs</>}
          </div>
        </div>
      )}

      {/* •"?•"? Nouvelle section •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      {showNewSection && (
        <div className={styles.newSectionForm}>
          <input
            className={styles.input}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowNewSection(false) }}
            placeholder="Nom de la section (ex : Droits d'auteur, Diffusion…)"
            autoFocus
          />
          <button className={styles.btnConfirm} onClick={handleAddSection}>Créer</button>
          <button className={styles.btnCancel} onClick={() => setShowNewSection(false)}>•o.</button>
        </div>
      )}

      {/* •"?•"? Canvas •"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"?•"? */}
      <div className={styles.canvasRow}>
        <div className={styles.canvas} style={{ width: canvasWidth }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={allSectionIds} strategy={verticalListSortingStrategy}>
              <div className={styles.sections}>
                {sections.map((section) => (
                  <BuilderSection
                    key={section.id}
                    section={section}
                    onRename={section.isFixed ? undefined : handleSectionRename}
                    onDelete={section.isFixed ? undefined : handleSectionDelete}
                    onFieldUpdate={handleFieldUpdate}
                    onFieldDelete={handleFieldDelete}
                    onAddField={handleAddField}
                  />
                ))}
                {sections.length === 0 && (
                  <div className={styles.empty}>
                    <p>Aucune section. Cliquez sur <strong>+ Section</strong> pour commencer.</p>
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeLabel && (
                <div className={isActiveField ? styles.ghostField : styles.ghostSection}>
                  {activeLabel}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        <div className={styles.resizeGrip} onMouseDown={startResize} title="Redimensionner">
          <GripLines />
        </div>
      </div>
    </div>
  )
}

function GripLines() {
  return (
    <svg width="6" height="24" viewBox="0 0 6 24" fill="none" aria-hidden>
      {[2, 7, 12, 17, 22].map((y) => (
        <rect key={y} x="1" y={y} width="4" height="2" rx="1" fill="currentColor" />
      ))}
    </svg>
  )
}




