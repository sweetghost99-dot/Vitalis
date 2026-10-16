import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite rejects requests whose Host header it does not recognise. A preview
 * tunnel (or any other proxy) needs its hostname allowed explicitly, and that
 * hostname is runtime information, so it is read from the environment rather
 * than committed:
 *
 *   PREVIEW_HOST=my-preview.example.com npm run dev
 *
 * localhost and IP literals are always allowed by Vite, so this stays optional.
 */
const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
const previewHost = processEnv?.PREVIEW_HOST

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: previewHost ? [previewHost] : undefined,
  },
})
