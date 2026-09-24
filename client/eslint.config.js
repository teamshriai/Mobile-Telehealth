import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      // eslint-plugin-react-hooks 5.2 exposes `recommended-latest`. The old
      // `configs.flat.recommended` path does not exist in this version, which
      // is why lint threw on startup and had silently not run for some time.
      reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],

      // Without these, every component and icon used ONLY inside JSX is
      // reported as an unused variable — 300+ false positives that drown out
      // any real finding. The rule has to be told JSX counts as a usage.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // Co-locating a hook or constant beside its component costs a full HMR
      // reload rather than a fast refresh. That is a deliberate dev-ergonomics
      // trade-off, so warn rather than block the build — but the baseline is
      // kept at zero by splitting the offending exports into their own files
      // (see app/*.constants.ts / *.types.ts) rather than silencing the rule.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      'react-hooks/set-state-in-effect': 'off',

      // TS already enforces this at compile time via `strict`; the ESLint
      // rule duplicates it with worse inference and false positives on
      // patterns like `req.user!.id` that the codebase's server half already
      // relies on.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  /**
   * The Playwright suite. Node, not a browser; Playwright, not React.
   *
   * ⚠️ `react-hooks/rules-of-hooks` fires on every Playwright fixture, because
   * a fixture's second argument is conventionally named `use` and the rule
   * reads any `use*` call as a hook. It is a name collision, not a finding —
   * there is no React in `e2e/`. Scoping the React rules off here is the honest
   * fix; disabling them inline in each fixture would be noise that outlives the
   * reason for it.
   */
  {
    files: ['e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
