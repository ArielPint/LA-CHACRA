import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages sirve este repo bajo /LA-CHACRA/, y este subproyecto va en
  // /financiero/ dentro de eso. Solo aplica al build de producción — en
  // desarrollo local (`npm run dev`) se sirve desde la raíz como siempre.
  base: command === 'build' ? '/LA-CHACRA/financiero/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
