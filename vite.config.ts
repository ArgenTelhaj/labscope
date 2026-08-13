import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/labscope/ in production, / in dev.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
