import { z } from 'zod'
import { ENTITY_TYPES } from '../constants/entity-types'
import { LocalizedStringSchema } from './i18n'

const SelectOptionSchema = z.object({
  value: z.string().min(1),
  label: LocalizedStringSchema,
})

const baseFields = {
  id:          z.string().uuid(),
  tenantId:    z.string().uuid(),
  entityType:  z.enum(ENTITY_TYPES).optional().nullable(),
  rayonId:     z.string().uuid().optional().nullable(),
  label:       LocalizedStringSchema,
  position:    z.number().int().nonnegative(),
  required:    z.boolean(),
  category:    z.string().nullable().optional(),
  halfWidth:   z.boolean().optional(),
  placeholder: z.string().nullable().optional(),
  validation:  z.object({
    type:    z.enum(['email', 'phone', 'name', 'regex']),
    pattern: z.string().optional(),
    message: z.string().min(1),
  }).nullable().optional(),
}

export const CustomFieldDefinitionSchema = z.discriminatedUnion('fieldType', [
  z.object({ ...baseFields, fieldType: z.literal('thesaurus'), thesaurusId: z.string().uuid(), options: z.null() }),
  z.object({ ...baseFields, fieldType: z.literal('select'),    thesaurusId: z.null(), options: z.array(SelectOptionSchema).min(1) }),
  z.object({ ...baseFields, fieldType: z.enum(['text', 'textarea', 'number', 'date', 'boolean'] as const), thesaurusId: z.null(), options: z.null() }),
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
