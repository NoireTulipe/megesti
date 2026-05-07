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
  caisse:   ['#C4847A', '#8B7BAB'] as [string, string],
  sessions: ['#6B8F71', '#4A7058'] as [string, string],
  bilan:    ['#C9933A', '#A07028'] as [string, string],
}

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
