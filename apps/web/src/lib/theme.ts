export interface ThemeConfig {
  cream:      string
  creamDark:  string
  ink:        string
  inkLight:   string
  inkFaint:   string
  terra:      string
  terraLight: string
  terraMid:   string
  sage:       string
  sageLight:  string
  gold:       string
  goldLight:  string
}

export const DEFAULT_THEME: ThemeConfig = {
  cream:      '#FAF6EF',
  creamDark:  '#F2EAE0',
  ink:        '#1C3A5E',
  inkLight:   '#3A5A7E',
  inkFaint:   '#E8EEF5',
  terra:      '#D95F3B',
  terraLight: '#FDEEE9',
  terraMid:   '#F2B49E',
  sage:       '#5C8F6A',
  sageLight:  '#E8F3EB',
  gold:       '#C9933A',
  goldLight:  '#FBF3E4',
}

const CSS_VAR_MAP: Record<keyof ThemeConfig, string> = {
  cream:      '--cream',
  creamDark:  '--cream-dark',
  ink:        '--ink',
  inkLight:   '--ink-light',
  inkFaint:   '--ink-faint',
  terra:      '--terra',
  terraLight: '--terra-light',
  terraMid:   '--terra-mid',
  sage:       '--sage',
  sageLight:  '--sage-light',
  gold:       '--gold',
  goldLight:  '--gold-light',
}

export function applyTheme(theme: Partial<ThemeConfig>): void {
  const root = document.documentElement
  const merged = { ...DEFAULT_THEME, ...theme }
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = merged[key as keyof ThemeConfig]
    root.style.setProperty(cssVar, value)
  }
}

export function resetTheme(): void {
  const root = document.documentElement
  for (const cssVar of Object.values(CSS_VAR_MAP)) {
    root.style.removeProperty(cssVar)
  }
}
