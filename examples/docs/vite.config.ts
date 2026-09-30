import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tanstackRouter from '@tanstack/router-plugin/vite'
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { componentDocs } from './src/plugins/component-docs.ts'
import { choiceStyles, homeStyles } from './src/styles/home.ts'
import { adaptiveStyles, gridStyles, motionStyles } from './src/styles/lab.ts'
import { playgroundEditorStyles } from './src/styles/playground-editor.ts'
import { proseStyles } from './src/styles/prose.ts'
import { showcaseStyles } from './src/styles/showcase.ts'
import {
  codeStyles,
  docsStyles,
  experimentStyles,
  footerStyles,
  headerStyles,
  indexStyles,
  pagerStyles,
  sidebarStyles,
  tocStyles,
} from './src/styles/site.ts'
import { docsSystem } from './src/styles/system.ts'
import { visualStyles } from './src/styles/visualisations.ts'

const uiRoot = fileURLToPath(new URL('../ui', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${path.join(uiRoot, 'src')}/`,
    },
  },
  plugins: [
    toned({
      system: docsSystem,
      sheets: [
        adaptiveStyles,
        motionStyles,
        gridStyles,
        homeStyles,
        showcaseStyles,
        choiceStyles,
        visualStyles,
        proseStyles,
        playgroundEditorStyles,
        headerStyles,
        docsStyles,
        sidebarStyles,
        tocStyles,
        pagerStyles,
        codeStyles,
        indexStyles,
        experimentStyles,
        footerStyles,
      ],
      inputs: [
        'src/styles/visualisations.ts',
        'src/styles/prose.ts',
        'src/styles/playground-editor.ts',
        'src/styles/site.ts',
        'src/styles/brand.ts',
        'src/styles/system.ts',
        'src/styles/home.ts',
        'src/styles/lab.ts',
        'src/styles/showcase.ts',
      ],
    }),
    componentDocs({
      componentsDir: path.join(uiRoot, 'src/components/ui'),
      tsconfigPath: path.join(uiRoot, 'tsconfig.json'),
    }),
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    react(),
  ],
})
