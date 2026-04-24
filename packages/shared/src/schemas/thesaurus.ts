import { z } from 'zod'
import { LocalizedStringSchema } from './i18n'

export const ThesaurusEntrySchema = z.object({
  id:          z.string().uuid(),
  thesaurusId: z.string().uuid(),
  label:       LocalizedStringSchema,
  position:    z.number().int().nonnegative(),
  parentId:    z.string().uuid().nullable(),
})

export const ThesaurusSchema = z.object({
  id:          z.string().uuid(),
  tenantId:    z.string().uuid(),
  name:        LocalizedStringSchema,
  description: LocalizedStringSchema.optional(),
  entries:     z.array(ThesaurusEntrySchema),
})

// id fourni par le client (UUIDs côté client), tenantId injecté par le serveur depuis le JWT
export const CreateThesaurusSchema = ThesaurusSchema.omit({ tenantId: true, entries: true })

// id fourni par le client, thesaurusId vient de l'URL
export const CreateThesaurusEntrySchema = ThesaurusEntrySchema.omit({ thesaurusId: true })
