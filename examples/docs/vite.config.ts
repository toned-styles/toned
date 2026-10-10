import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tanstackRouter from '@tanstack/router-plugin/vite'
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { homeStory } from './src/components/home/story/vite.ts'
import { componentDocs } from './src/plugins/component-docs.ts'
import { searchIndex } from './src/plugins/search-index.js'
import { choiceStyles, homeStyles } from './src/styles/home.ts'
import { adaptiveStyles, gridStyles, motionStyles } from './src/styles/lab.ts'
import { libraryStyles } from './src/styles/library.ts'
import { playgroundEditorStyles } from './src/styles/playground-editor.ts'
import { playgroundStyles } from './src/styles/playground.ts'
import { proseStyles } from './src/styles/prose.ts'
import { searchStyles } from './src/styles/search.ts'
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
import { themesPageStyles } from './src/styles/themes/page.ts'
import { themeShowcase } from './src/styles/themes/vite.ts'

const uiRoot = fileURLToPath(new URL('../ui', import.meta.url))

export default defineConfig({
  // The playground's language worker loads TypeScript and its type payload as
  // separate lazy chunks, which only the ES worker format can split.
  worker: { format: 'es' },
  // Pinned to this project's tsconfig. The playground reads the Toned packages
  // as raw source, and automatic discovery would otherwise walk up to the
  // repository's root config and load every example it references, installed
  // or not.
  tsconfig: './tsconfig.json',
  // Loaded only from effects, so the dev server would otherwise discover them
  // on first visit and reload the page mid-session.
  optimizeDeps: {
    include: [
      '@codemirror/autocomplete',
      '@codemirror/commands',
      '@codemirror/lang-javascript',
      '@codemirror/language',
      '@codemirror/lint',
      '@codemirror/state',
      '@codemirror/view',
      '@lezer/highlight',
      '@toned/compiler > vscode-languageserver-textdocument',
    ],
  },
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
        choiceStyles,
        proseStyles,
        playgroundEditorStyles,
        playgroundStyles,
        libraryStyles,
        themesPageStyles,
        headerStyles,
        docsStyles,
        sidebarStyles,
        tocStyles,
        pagerStyles,
        codeStyles,
        indexStyles,
        experimentStyles,
        footerStyles,
        searchStyles,
      ],
      inputs: [
        'src/styles/prose.ts',
        'src/styles/playground-editor.ts',
        'src/styles/site.ts',
        'src/styles/brand.ts',
        'src/styles/tokens.ts',
        'src/styles/system.ts',
        'src/styles/library.ts',
        'src/styles/playground.ts',
        'src/styles/home.ts',
        'src/styles/lab.ts',
        'src/components/lab/adaptive.styles.ts',
        'src/components/lab/motion.styles.ts',
        'src/components/lab/grid.styles.ts',
        'src/styles/themes/page.ts',
        'src/styles/search.ts',
      ],
    }),
    // The theme showcase's own system: its classes and one palette per theme.
    themeShowcase(),
    // The homepage's worked example: one small system of its own.
    homeStory(),
    componentDocs({
      componentsDir: path.join(uiRoot, 'src/components/ui'),
      tsconfigPath: path.join(uiRoot, 'tsconfig.json'),
    }),
    // Site search: serves /search-index.json in development (the build writes
    // it from the prerendered pages, see prerender.js).
    searchIndex({ componentsDir: path.join(uiRoot, 'src/components/ui') }),
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    react(),
  ],
})
