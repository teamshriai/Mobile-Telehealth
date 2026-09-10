import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
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
      'no-unused-vars': ['warn', {
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
      // trade-off (AuthContext exports useAuth; guards.jsx exports
      // homeForRole), so warn rather than block the build.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
