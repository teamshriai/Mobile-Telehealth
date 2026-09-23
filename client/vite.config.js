import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import tailwindcss         from '@tailwindcss/vite'
import { fileURLToPath }   from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// Kept in sync with tsconfig.json's `compilerOptions.paths` by hand — Vite and
// TypeScript resolve aliases independently and nothing keeps the two in sync
// automatically. The previous alias set (@data, @hooks, @assets) pointed at
// directories that never existed and was never imported anywhere; this set is
// exactly what the codebase actually has.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@':          resolve(__dirname, './src'),
      '@app':       resolve(__dirname, './src/app'),
      '@components':resolve(__dirname, './src/components'),
      '@pages':     resolve(__dirname, './src/pages'),
      '@services':  resolve(__dirname, './src/services'),
      '@lib':       resolve(__dirname, './src/lib'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
