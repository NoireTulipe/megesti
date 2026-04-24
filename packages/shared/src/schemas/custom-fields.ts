import { z } from 'zod'
import { ENTITY_TYPES } from '../constants/entity-types'
import { FIELD_TYPES } from '../constants/field-types'
import { LocalizedStringSchema } from './i18n'

const SelectOptionSchema = z.object({
  value: z.string().min(1),
  label: LocalizedStringSchema,
})

export const CustomFieldDefinitionSchema = z.discriminatedUnion('fieldType', [
  z.object({
    id:          z.string().uuid(),
    tenantId:    z.string().uuid(),
    entityType:  z.enum(ENTITY_TYPES),
    label:       LocalizedStringSchema,
    fieldType:   z.literal('thesaurus'),
    position:    z.number().int().nonnegative(),
    required:    z.boolean(),
    thesaurusId: z.string().uuid(),
    options:     z.null(),
  }),
  z.object({
    id:          z.string().uuid(),
    tenantId:    z.string().uuid(),
    entityType:  z.enum(ENTITY_TYPES),
    label:       LocalizedStringSchema,
    fieldType:   z.literal('select'),
    position:    z.number().int().nonnegative(),
    required:    z.boolean(),
    thesaurusId: z.null(),
    options:     z.array(SelectOptionSchema).min(1),
  }),
  z.object({
    id:          z.string().uuid(),
    tenantId:    z.string().uuid(),
    entityType:  z.enum(ENTITY_TYPES),
    label:       LocalizedStringSchema,
    fieldType:   z.enum(['text', 'textarea', 'number', 'date', 'boolean'] as const),
    position:    z.number().int().nonnegative(),
    required:    z.boolean(),
    thesaurusId: z.null(),
    options:     z.null(),
  }),
])

export const CustomFieldValueSchema = z.object({
  id:           z.string().uuid(),
  definitionId: z.string().uuid(),
  entityId:     z.string().uuid(),
  value:        z.union([z.string(), z.number(), z.boolean(), z.null()]),
})

// id fourni par le client, tenantId injecté depuis le JWT
export const CreateCustomFieldDefinitionSchema = z.discriminatedUnion('fieldType', [
  CustomFieldDefinitionSchema.options[0].omit({ tenantId: true }),
  CustomFieldDefinitionSchema.options[1].omit({ tenantId: true }),
  CustomFieldDefinitionSchema.options[2].omit({ tenantId: true }),
])
