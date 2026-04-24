import { z } from 'zod'

export const LocalizedStringSchema = z.object({
  fr: z.string().min(1),
  en: z.string().optional(),
})
