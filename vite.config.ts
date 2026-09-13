import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built bundle works from file:// and from a GitHub Pages subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
})
