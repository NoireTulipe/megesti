// ════════════════════════════════════════════════════════════════
// MEGESTI Mobile — Design System
// Palette éditoriale chaleureuse · identique au web
// ════════════════════════════════════════════════════════════════

export const Colors = {
  // Fond
  cream:      '#FAF7F2',
  creamDark:  '#EDE7DC',
  creamMid:   '#F3EDE4',
  white:      '#FFFFFF',

  // Texte
  text:       '#2C2118',
  textMid:    '#6B5748',
  textSoft:   '#A8978C',

  // Primaire — bleu nuit chaud
  ink:        '#243347',
  inkLight:   '#3D5470',
  inkFaint:   '#EDF1F7',
  inkDeep:    '#141F30',

  // Accent féminin
  rose:       '#C4907C',
  roseDark:   '#A87060',
  roseLight:  '#F9EDE8',
  roseMid:    '#E4B8AC',

  // Action / alerte
  terra:      '#C85D3A',
  terraLight: '#FCF0EC',
  terraMid:   '#EDAB98',

  // Succès
  sage:       '#6B8F71',
  sageLight:  '#EDF4EE',

  // Highlight
  gold:       '#C9933A',
  goldLight:  '#FBF5E6',

  // Mauve
  mauve:      '#8B7BAB',
  mauveLight: '#F3F0F9',

  // Transparents
  shadowXs:   'rgba(44,33,24,0.06)',
  overlay:    'rgba(28,58,94,0.30)',
} as const

export const Fonts = {
  display:       'DM Serif Display',
  displayItalic: 'DM Serif Display Italic',
  body:          'Plus Jakarta Sans',
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const

// Gradients prédéfinis (rose→mauve pour caisse, sage pour sessions, gold pour bilan)
export const Gradients = {
  caisse:      ['#C4847A', '#8B7BAB'] as [string, string],
  caisseDark:  ['#A06050', '#6A5080'] as [string, string],
  stock:       ['#6B8F71', '#2D4A38'] as [string, string],
  stockDark:   ['#3A5540', '#1A2A20'] as [string, string],
  sessions:    ['#5F7B9C', '#2A3D58'] as [string, string],
  sessionsDark:['#354560', '#182230'] as [string, string],
  bilan:       ['#C9933A', '#7A4E10'] as [string, string],
  bilanDark:   ['#806020', '#4A2E08'] as [string, string],
}

// ── Thème sombre (mode nuit, inspiré du login) ──────────────────────────

export const Dark = {
  bg:         '#101D33',
  bgGradient: ['#1E1A2E', '#1A2744', '#101D33'] as [string, string, string],
  surface:    'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  text:       '#FFFFFF',
  textMid:    'rgba(255,255,255,0.65)',
  textSoft:   'rgba(255,255,255,0.40)',
  accent:     '#C4847A',
  accentGlow: 'rgba(196,144,124,0.25)',
  ink:        '#F0EDF8',
  inkLight:   'rgba(255,255,255,0.55)',
  inkFaint:   'rgba(255,255,255,0.08)',
  rose:       '#D4A090',
  roseLight:  'rgba(196,144,124,0.12)',
  terra:      '#E08060',
  terraLight: 'rgba(200,93,58,0.15)',
  sage:       '#7BA382',
  sageLight:  'rgba(107,143,113,0.12)',
  gold:       '#D4A54A',
  goldLight:  'rgba(201,147,58,0.12)',
  cream:      '#1A2235',
  creamDark:  'rgba(255,255,255,0.08)',
  white:      'rgba(255,255,255,0.07)',
  overlay:    'rgba(0,0,0,0.55)',
  shadow:     'rgba(0,0,0,0.30)',
}

// ── Ombres ──────────────────────────────────────────────────────────────

export const Shadow = {
  card: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  float: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
}
