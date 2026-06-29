/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:        'var(--cream)',
        'cream-dark': 'var(--cream-dark)',
        'cream-mid':  'var(--cream-mid)',
        ink:          'var(--ink)',
        'ink-light':  'var(--ink-light)',
        'ink-deep':   'var(--ink-deep)',
        rose:         'var(--rose)',
        'rose-dark':  'var(--rose-dark)',
        'rose-mid':   'var(--rose-mid)',
        'rose-light': 'var(--rose-light)',
        sage:         'var(--sage)',
        'sage-light': 'var(--sage-light)',
        gold:         'var(--gold)',
        'gold-light': 'var(--gold-light)',
        mauve:        'var(--mauve)',
        'mauve-light':'var(--mauve-light)',
      },
      fontFamily: {
        sans:  ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
        btn:  'var(--radius-btn)',
        input:'var(--radius-input)',
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
        float: 'var(--shadow-float)',
        rose:  'var(--shadow-rose)',
        ink:   'var(--shadow-ink)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        out:    'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
