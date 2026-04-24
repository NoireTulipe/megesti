import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:      'var(--cream)',
        'cream-dark': 'var(--cream-dark)',
        ink:        'var(--ink)',
        'ink-light': 'var(--ink-light)',
        'ink-faint': 'var(--ink-faint)',
        terra:      'var(--terra)',
        'terra-light': 'var(--terra-light)',
        sage:       'var(--sage)',
        'sage-light': 'var(--sage-light)',
        gold:       'var(--gold)',
        'gold-light': 'var(--gold-light)',
        'text-base': 'var(--text)',
        'text-mid': 'var(--text-mid)',
        'text-soft': 'var(--text-soft)',
      },
      fontFamily: {
        sans:  ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
      },
    },
  },
  plugins: [],
} satisfies Config
