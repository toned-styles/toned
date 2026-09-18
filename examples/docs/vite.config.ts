import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tanstackRouter from '@tanstack/router-plugin/vite'
import toned from '@toned/core/vite'
import { system } from '@toned/systems/base'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { componentDocs } from './src/plugins/component-docs.ts'

const uiRoot = fileURLToPath(new URL('../ui', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${path.join(uiRoot, 'src')}/`,
    },
  },
  plugins: [
    toned({ system }),
    componentDocs({
      componentsDir: path.join(uiRoot, 'src/components/ui'),
      tsconfigPath: path.join(uiRoot, 'tsconfig.json'),
    }),
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    react(),
  ],
})
