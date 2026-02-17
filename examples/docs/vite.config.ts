import mdx from '@mdx-js/rollup'
import tanstackRouter from '@tanstack/router-plugin/vite'
import toned from '@toned/core/vite'
import { system } from '@toned/systems/base'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    toned({ system }),
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    mdx(),
    react(),
  ],
})
