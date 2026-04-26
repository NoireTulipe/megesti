import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BuilderField as BField } from './types'
import { FieldInput } from './FieldInput'
import styles from './BuilderField.module.css'

interface Props {
  field:     BField
  sectionId: string
  onUpdate:  (sectionId: string, fieldId: string, patch: Partial<BField>) => void
  onDelete:  (sectionId: string, fieldId: string) => void
}

const DEFAULT_MESSAGES: Record<string, string> = {
  email: 'Email invalide',
  phone: 'Numéro invalide',
  name:  'Format invalide (lettres uniquement)',
  regex: 'Format invalide',
}

export function BuilderField({ field, sectionId, onUpdate, onDelete }: Props) {
  const [editing, setEditing]       = useState(false)
  const [labelDraft, setLabelDraft] = useState(field.labelFr)
  const [phDraft, setPhDraft]       = useState(field.placeholder ?? '')
  const [valType, setValType]       = useState(field.validation?.type ?? '')
  const [valPattern, setValPattern] = useState(field.validation?.pattern ?? '')
  const [valMessage, setValMessage] = useState(field.validation?.message ?? '')
  const [isDeleting, setIsDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   `field::${sectionId}::${field.id}`,
    data: { type: 'field', sectionId, fieldId: field.id },
  })

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.35 : 1,
    gridColumn: field.halfWidth ? 'span 1' : 'span 2',
  }

  function openEdit() {
    setLabelDraft(field.labelFr)
    setPhDraft(field.placeholder ?? '')
    setValType(field.validation?.type ?? '')
    setValPattern(field.validation?.pattern ?? '')
    setValMessage(field.validation?.message ?? '')
    setEditing(true)
  }

  function abortEdit() {
    setLabelDraft(field.labelFr)
    setPhDraft(field.placeholder ?? '')
    setValType(field.validation?.type ?? '')
    setValPattern(field.validation?.pattern ?? '')
    setValMessage(field.validation?.message ?? '')
    setEditing(false)
  }

  function commitEdit() {
    const newLabel = labelDraft.trim()
    const newPh    = phDraft.trim() || null
    const newVal   = valType === ''
      ? null
      : {
          type: valType,
          ...(valType === 'regex' ? { pattern: valPattern } : {}),
          message: valMessage.trim() || DEFAULT_MESSAGES[valType] || 'Format invalide',
        }

    const changed =
      newLabel !== field.labelFr ||
      newPh !== (field.placeholder ?? null) ||
      JSON.stringify(newVal) !== JSON.stringify(field.validation ?? null)

    if (newLabel && changed) {
      onUpdate(sectionId, field.id, { labelFr: newLabel, placeholder: newPh, validation: newVal })
    }
    setEditing(false)
  }

  async function handleDelete() {
    setIsDeleting(true)
    try { await onDelete(sectionId, field.id) }
    finally { setIsDeleting(false) }
  }

  const hasValidation = !!field.validation?.type

  return (
    <div ref={setNodeRef} style={style} className={`${styles.wrap} ${isDragging ? styles.dragging : ''}`}>
      {/* Drag handle */}
      <span className={styles.handle} {...attributes} {...listeners} aria-label="Déplacer">
        <DragDots />
      </span>

      {/* Corps */}
      <div className={styles.body}>
        {editing ? (
          <div className={styles.editPanel}>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>Label</label>
              <input
                className={styles.editInput}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') abortEdit() }}
                autoFocus
              />
            </div>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>Placeholder</label>
              <input
                className={styles.editInput}
                value={phDraft}
                onChange={(e) => setPhDraft(e.target.value)}
                placeholder="Texte indicatif dans l'input vide…"
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') abortEdit() }}
              />
            </div>

            <div className={styles.editSep} />
            <span className={styles.editSubLabel}>Validation</span>

            <div className={styles.editRow}>
              <label className={styles.editLabel}>Type</label>
              <select
                className={styles.editSelect}
                value={valType}
                onChange={(e) => {
                  setValType(e.target.value)
                  setValMessage('')
                  setValPattern('')
                }}
              >
                <option value="">Aucune</option>
                <option value="email">Email</option>
                <option value="phone">Téléphone</option>
                <option value="name">Nom / Prénom</option>
                <option value="regex">Expression régulière</option>
              </select>
            </div>

            {valType === 'regex' && (
              <div className={styles.editRow}>
                <label className={styles.editLabel}>Regex</label>
                <input
                  className={styles.editInput}
                  value={valPattern}
                  onChange={(e) => setValPattern(e.target.value)}
                  placeholder="^[A-Z]{3}\d+$"
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
                />
              </div>
            )}

            {valType !== '' && (
              <div className={styles.editRow}>
                <label className={styles.editLabel}>Message</label>
                <input
                  className={styles.editInput}
                  value={valMessage}
                  onChange={(e) => setValMessage(e.target.value)}
                  placeholder={DEFAULT_MESSAGES[valType] ?? 'Format invalide'}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
                />
              </div>
            )}

            <div className={styles.editActions}>
              <button className={styles.btnSave} onClick={commitEdit}>Valider</button>
              <button className={styles.btnAbort} onClick={abortEdit}>Annuler</button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.labelRow}>
              <span className={styles.label} onDoubleClick={openEdit} title="Double-cliquer pour modifier">
                {field.labelFr}
              </span>
              {field.required && <span className={styles.required}>*</span>}
              {hasValidation && <span className={styles.validationBadge}>{field.validation!.type}</span>}
              {field.placeholder && <span className={styles.phHint}>({field.placeholder})</span>}
            </div>
            <FieldInput field={field} />
          </>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${field.halfWidth ? styles.btnActive : ''}`}
            onClick={() => onUpdate(sectionId, field.id, { halfWidth: !field.halfWidth })}
            title={field.halfWidth ? 'Pleine largeur' : 'Demi-largeur'}
          >⊞</button>
          <button
            className={`${styles.btn} ${field.required ? styles.btnActive : ''}`}
            onClick={() => onUpdate(sectionId, field.id, { required: !field.required })}
            title={field.required ? 'Requis' : 'Optionnel'}
          >{field.required ? '★' : '☆'}</button>
          <button
            className={`${styles.btn} ${styles.btnEdit}`}
            onClick={openEdit}
            title="Modifier label / placeholder / validation"
          >✎</button>
          <button
            className={`${styles.btn} ${styles.btnDelete}`}
            onClick={handleDelete}
            disabled={isDeleting}
            title="Supprimer"
          >{isDeleting ? '…' : '×'}</button>
        </div>
      )}
    </div>
  )
}

function DragDots() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden>
      {[2, 6, 10, 14].map((y) => (
        <g key={y}>
          <circle cx="2.5" cy={y} r="1.5" fill="currentColor" />
          <circle cx="7.5" cy={y} r="1.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
