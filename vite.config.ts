import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Two targets:
 *  - default: a normal hashed bundle for GitHub Pages or any static host.
 *  - FILE_BUILD=1: one chunk, no code splitting, so the post-build inliner can
 *    fold everything into a single index.html that runs from a file:// URL.
 * Both use a relative base so the output works from any subpath.
 */
const singleFile = process.env.FILE_BUILD === '1'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: singleFile ? 'dist-file' : 'dist',
    ...(singleFile
      ? {
          modulePreload: { polyfill: false },
          cssCodeSplit: false,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : {}),
  },
})
