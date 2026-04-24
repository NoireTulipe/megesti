export type Locale = 'fr' | 'en'

export interface LocalizedString {
  fr: string
  en?: string
}

export function localise(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value.fr
}
