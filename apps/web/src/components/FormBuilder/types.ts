import type { FieldType } from '@megesti/shared'
import type { FixedField } from '@/lib/fixedSections'

export interface BuilderField {
  id:          string
  labelFr:     string
  fieldType:   FieldType
  required:    boolean
  thesaurusId: string | null
  options:     { value: string; label: { fr: string; en?: string } }[] | null
  halfWidth?:  boolean
  placeholder?: string | null
  validation?: { type: string; pattern?: string; message: string } | null
}

/** Section telle qu'affichée dans le canvas WYSIWYG */
export interface CanvasSection {
  id:          string       // slug, ex "contact"
  label:       string       // label affiché = valeur `category` en DB
  isFixed:     boolean      // section fixe : non renommable, non supprimable
  fixedFields: FixedField[] // champs système hardcodés
  fields:      BuilderField[] // champs custom depuis la DB
}
