import type { LocalizedString } from './i18n'
import type { EntityType } from '../constants/entity-types'
import type { FieldType } from '../constants/field-types'

export interface SelectOption {
  value: string
  label: LocalizedString
}

export interface ThesaurusEntry {
  id:          string
  thesaurusId: string
  label:       LocalizedString
  position:    number
  parentId:    string | null
}

export interface Thesaurus {
  id:          string
  tenantId:    string
  name:        LocalizedString
  description?: LocalizedString
  entries:     ThesaurusEntry[]
}

export interface CustomFieldDefinition {
  id:          string
  tenantId:    string
  entityType:  EntityType
  label:       LocalizedString
  fieldType:   FieldType
  position:    number
  required:    boolean
  thesaurusId: string | null   // fieldType === 'thesaurus'
  options:     SelectOption[] | null  // fieldType === 'select'
}

export interface CustomFieldValue {
  id:           string
  definitionId: string
  entityId:     string
  value:        string | number | boolean | null
}
