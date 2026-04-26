import { useState } from 'react'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BuilderField } from './BuilderField'
import { FieldInput } from './FieldInput'
import type { CanvasSection, BuilderField as BField } from './types'
import type { FixedField } from '@/lib/fixedSections'
import { FIELD_TYPES } from '@megesti/shared'
import type { FieldType } from '@megesti/shared'
import styles from './BuilderSection.module.css'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texte', textarea: 'Texte long', number: 'Nombre',
  date: 'Date', boolean: 'Checkbox', select: 'Liste', thesaurus: 'Thésaurus',
}

interface Props {
  section:        CanvasSection
  onRename?:      (id: string, newLabel: string) => Promise<void>
  onDelete?:      (id: string) => Promise<void>
  onFieldUpdate:  (sectionId: string, fieldId: string, patch: Partial<BField>) => void
  onFieldDelete:  (sectionId: string, fieldId: string) => Promise<void>
  onAddField:     (sectionId: string, fieldType: FieldType, label: string) => Promise<void>
}

export function BuilderSection({ section, onRename, onDelete, onFieldUpdate, onFieldDelete, onAddField }: Props) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft]     = useState(section.label)
  const [showAddField, setShowAddField] = useState(false)
  const [newLabel, setNewLabel]         = useState('')
  const [newType, setNewType]           = useState<FieldType>('text')
  const [isAdding, setIsAdding]         = useState(false)
  const [isDeleting, setIsDeleting]     = useState(false)

  const fieldIds = section.fields.map((f) => `field::${section.id}::${f.id}`)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:       `section::${section.id}`,
    data:     { type: 'section', sectionId: section.id },
    disabled: section.isFixed,
  })

  const sectionStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function commitRename() {
    const t = labelDraft.trim()
    if (t && t !== section.label) await onRename?.(section.id, t)
    setEditingLabel(false)
  }

  async function handleAdd() {
    if (!newLabel.trim()) return
    setIsAdding(true)
    try {
      await onAddField(section.id, newType, newLabel.trim())
      setNewLabel('')
      setShowAddField(false)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDeleteSection() {
    if (!confirm(`Supprimer la section « ${section.label} » et tous ses champs custom ?`)) return
    setIsDeleting(true)
    try { await onDelete?.(section.id) }
    finally { setIsDeleting(false) }
  }

  const totalFields = section.fixedFields.length + section.fields.length

  return (
    <div ref={setNodeRef} style={sectionStyle} className={`${styles.section} ${isDragging ? styles.dragging : ''} ${section.isFixed ? styles.fixed : ''}`}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        {section.isFixed ? (
          <span className={styles.sysIcon} title="Section intégrée au modèle de données">🔒</span>
        ) : (
          <span className={styles.dragHandle} {...attributes} {...listeners} aria-label="Déplacer la section">
            <GripIcon />
          </span>
        )}

        {editingLabel && !section.isFixed ? (
          <input
            className={styles.labelInput}
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingLabel(false) }}
            autoFocus
          />
        ) : (
          <span
            className={styles.sectionLabel}
            onDoubleClick={() => !section.isFixed && setEditingLabel(true)}
            title={section.isFixed ? undefined : 'Double-cliquer pour renommer'}
          >
            {section.label}
          </span>
        )}

        <span className={styles.count}>{totalFields} champ{totalFields !== 1 ? 's' : ''}</span>

        <button className={styles.addBtn} onClick={() => setShowAddField((v) => !v)} title="Ajouter un champ personnalisé">+</button>

        {!section.isFixed && (
          <button
            className={styles.delBtn}
            onClick={handleDeleteSection}
            disabled={isDeleting}
            title="Supprimer la section"
          >{isDeleting ? '…' : '×'}</button>
        )}
      </div>

      {/* ── Grille ──────────────────────────────────────────────── */}
      <div className={styles.grid}>
        {/* Champs système (non draggables) */}
        {section.fixedFields.map((f) => (
          <LockedField key={f.id} field={f} />
        ))}

        {/* Champs custom (draggables) */}
        <SortableContext items={fieldIds} strategy={rectSortingStrategy}>
          {section.fields.map((field) => (
            <BuilderField
              key={field.id}
              field={field}
              sectionId={section.id}
              onUpdate={onFieldUpdate}
              onDelete={onFieldDelete}
            />
          ))}
        </SortableContext>

        {totalFields === 0 && !showAddField && (
          <p className={styles.emptyHint}>Section vide — cliquez sur + pour ajouter un champ.</p>
        )}
      </div>

      {/* ── Formulaire ajout inline ─────────────────────────────── */}
      {showAddField && (
        <div className={styles.addForm}>
          <select className={styles.select} value={newType} onChange={(e) => setNewType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{FIELD_TYPE_LABELS[ft]}</option>)}
          </select>
          <input
            className={styles.input}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddField(false) }}
            placeholder="Nom du champ…"
            autoFocus
          />
          <button className={styles.btnConfirm} onClick={handleAdd} disabled={!newLabel.trim() || isAdding}>
            {isAdding ? '…' : 'Ajouter'}
          </button>
          <button className={styles.btnCancel} onClick={() => setShowAddField(false)}>✕</button>
        </div>
      )}
    </div>
  )
}

// Champ système verrouillé, rendu en WYSIWYG

function LockedField({ field }: { field: FixedField }) {
  const fake = {
    id: field.id, labelFr: field.labelFr, fieldType: field.fieldType,
    required: field.required ?? false, thesaurusId: null, options: null,
    halfWidth: field.halfWidth,
  }
  return (
    <div className={styles.lockedField} style={{ gridColumn: field.halfWidth ? 'span 1' : 'span 2' }}>
      <div className={styles.lockedHeader}>
        <span className={styles.lockedIcon}>🔒</span>
        <span className={styles.lockedLabel}>{field.labelFr}</span>
        {field.required && <span className={styles.lockedReq}>*</span>}
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <FieldInput field={fake as any} />
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
      <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="4" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="8" width="14" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}
