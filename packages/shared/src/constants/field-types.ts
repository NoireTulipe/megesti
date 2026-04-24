import type { LocalizedString } from '../types/i18n'

export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
  'thesaurus',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const FIELD_TYPE_LABELS: Record<FieldType, LocalizedString> = {
  text:      { fr: 'Texte court',      en: 'Short text' },
  textarea:  { fr: 'Texte long',       en: 'Long text' },
  number:    { fr: 'Nombre',           en: 'Number' },
  date:      { fr: 'Date',             en: 'Date' },
  boolean:   { fr: 'Case à cocher',    en: 'Checkbox' },
  select:    { fr: 'Liste déroulante', en: 'Dropdown' },
  thesaurus: { fr: 'Thésaurus',        en: 'Thesaurus' },
}
