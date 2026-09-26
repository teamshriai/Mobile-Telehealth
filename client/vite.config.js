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
  build: {
    /*
     * ⚠️ FONTS ARE NEVER INLINED. Vite base64-inlines assets under 4 KB, and
     * one tiny font subset would otherwise land in the CSS as a `data:` URL —
     * which a `font-src 'self'` Content-Security-Policy on the hosting blocks.
     * Every font is a hashed, cacheable file instead.
     */
    assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf)$/.test(filePath) ? false : undefined),
    rollupOptions: {
      output: {
        /*
         * ⚠️ CACHING, NOT SIZE. Libraries that change rarely get their own
         * long-lived chunks, so an ordinary deploy — which changes app code —
         * does not make every returning patient re-download React, the router
         * and the animation library. Routes are already split per page by the
         * `lazy()` imports in App.tsx; this only separates the shared vendor
         * code underneath them.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) return 'vendor-react'
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'vendor-motion'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/axios')) return 'vendor-http'
          return undefined
        },
      },
    },
  },
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
    /**
     * ⚠️ DNS-REBINDING PROTECTION, NOT A CONVENIENCE TOGGLE.
     *
     * Vite 5.4.21 refuses any request whose `Host` header it does not
     * recognise, returning `403 Blocked request` BEFORE application code runs.
     * Out of the box it accepts IPv4 literals, bracketed IPv6 and
     * `localhost` — so `http://192.168.1.42:3000` already works and needs
     * nothing here.
     *
     * What it does NOT accept is an mDNS name like `http://ward-tablet.local`,
     * and the rest of this stack promises that it will: `cors.config.ts`
     * deliberately allows `*.local`, `cors.config.test.ts` asserts on it, and
     * `apiClient.ts` names it as a supported case. Three of the four layers
     * agreed; this was the one that did not.
     *
     * ⚠️ `['.local']` is a leading-dot SUFFIX match — never a literal IP, and
     * never `true`. `allowedHosts: true` disables the check entirely, which is
     * what the protection exists to prevent: any website you visit could then
     * point a hostname at this machine and read your dev server's responses.
     */
    allowedHosts: ['.local'],
    /**
     * ⚠️ NO `host` HERE, DELIBERATELY. LAN hosting is opt-in per command:
     *
     *     npm run dev       → loopback only (this default)
     *     npm run dev:lan   → `vite --host`, reachable from the Wi-Fi
     *
     * Binding every interface is what makes the app reachable from a phone or
     * tablet, and that is exactly why it is not the default. This dev server
     * renders real seeded patient records behind a real login, so putting it on
     * 0.0.0.0 without being asked — in a café, on hotel Wi-Fi, on a client
     * site — is not a convenience, it is an exposure.
     *
     * Vite prints the LAN URL on startup. Open THAT on the device, not
     * `localhost`, which on the device means the device.
     */
  },
})
