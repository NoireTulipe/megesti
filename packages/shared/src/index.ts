// Types
export type { Locale, LocalizedString } from './types/i18n'
export { localise } from './types/i18n'
export type { ThemeConfig } from './types/theme'
export type {
  SelectOption,
  ThesaurusEntry,
  Thesaurus,
  CustomFieldDefinition,
  CustomFieldValue,
} from './types/custom-fields'

// Plan features
export type { PlanTier, PlanFeatures } from './planFeatures'

// Facturation électronique
export type { FormatFacture, LigneFacture, FacturePayload, EmissionResult, FactureRecueBrute, InvoiceTransmissionService } from './types/invoice'
export type { EntrepriseResult } from './services/rechercheEntreprise'
export { rechercherEntreprises, rechercherParSiret } from './services/rechercheEntreprise'
export { PLAN_FEATURES, PLAN_LABELS, UPGRADE_MESSAGE, getPlanFeatures, canUseFeature } from './planFeatures'

// Constants
export { ENTITY_TYPES } from './constants/entity-types'
export type { EntityType } from './constants/entity-types'
export { FIELD_TYPES, FIELD_TYPE_LABELS } from './constants/field-types'
export type { FieldType } from './constants/field-types'

// Schemas
export { LocalizedStringSchema } from './schemas/i18n'
export {
  ThesaurusEntrySchema,
  ThesaurusSchema,
  CreateThesaurusSchema,
  CreateThesaurusEntrySchema,
} from './schemas/thesaurus'
export {
  CustomFieldDefinitionSchema,
  CustomFieldValueSchema,
  CreateCustomFieldDefinitionSchema,
} from './schemas/custom-fields'
