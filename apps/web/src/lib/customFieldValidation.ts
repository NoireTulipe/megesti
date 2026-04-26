import type { CustomFieldDef } from '@/features/reglages/hooks/useCustomFields'

const REGEXES: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+\d\s\-().]{7,}$/,
  name:  /^[a-zA-ZÀ-ÿ\s\-'.]+$/,
}

export function buildValidateRule(
  validation: CustomFieldDef['validation'],
): ((v: string) => string | true) | undefined {
  if (!validation) return undefined
  const re = validation.type === 'regex'
    ? (validation.pattern ? new RegExp(validation.pattern) : null)
    : (REGEXES[validation.type] ?? null)
  if (!re) return undefined
  const msg = validation.message
  return (v: string) => !v || re.test(v) || msg
}

/**
 * Valide manuellement les champs custom dans un formulaire avec zodResolver.
 * (zodResolver ignore les règles field-level de register())
 * Retourne true si des erreurs ont été trouvées.
 */
export function validateCustomFields(
  champs:      CustomFieldDef[],
  allValues:   Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError:    (field: string, error: { message: string }) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearErrors: (field: string) => void,
): boolean {
  champs.forEach((c) => clearErrors(`custom_${c.id}`))

  let hasErrors = false

  for (const champ of champs) {
    const fieldName = `custom_${champ.id}`
    const raw   = allValues[fieldName]
    const value = raw != null ? String(raw) : ''

    if (champ.required && !value) {
      setError(fieldName, { message: 'Requis' })
      hasErrors = true
      continue
    }

    if (champ.validation && value) {
      const validate = buildValidateRule(champ.validation)
      const result   = validate?.(value)
      if (typeof result === 'string') {
        setError(fieldName, { message: result })
        hasErrors = true
      }
    }
  }

  return hasErrors
}
