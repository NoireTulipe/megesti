// Types i18n — migreront vers @megesti/shared quand le package sera scaffoldé
export type Locale = 'fr' | 'en'
export type LocalizedString = { fr: string; en?: string }

export function localise(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value.fr
}
