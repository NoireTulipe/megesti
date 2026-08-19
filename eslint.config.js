import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**', '**/.turbo/**', '**/.astro/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  // ── React : règles des hooks + accessibilité ────────────────────────────────
  // Jusqu'ici aucune de ces règles n'était configurée sur une codebase React
  // entière. `exhaustive-deps` démarre en warn : le corriger d'un bloc
  // demanderait de revoir chaque effet, ce qui n'est pas un chantier de
  // pré-production.
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      // Les violations de `rules-of-hooks` sont de vrais crashs : en erreur.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Accessibilité en avertissement : ~250 signalements, c'est un chantier
      // à part entière. Visible sans bloquer la mise en prod.
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'warn'])
      ),
    },
  }
)
