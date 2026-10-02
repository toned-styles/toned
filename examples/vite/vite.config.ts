import { buttonStyles, cardStyles, ui } from '@examples/shared'
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

import { pageStyles } from './src/styles.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Generates `virtual:toned.css` and its manifest at build time. List every
    // sheet the application renders, including the lazily loaded Card.
    toned({
      system: ui,
      sheets: () => [pageStyles, buttonStyles, cardStyles],
      inputs: [
        'src/styles.ts',
        '../shared/button.ts',
        '../shared/card.ts',
        '../shared/system.ts',
      ],
    }),
    react(),
    cssLinkPlugin(),
  ],
})

/** Links the development server's stylesheets into the server-rendered HTML. */
function cssLinkPlugin(): Plugin {
  return {
    name: 'vite-css-link',
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html

      const links = Array.from(ctx.server.moduleGraph.urlToModuleMap.keys())
        .filter((url) => url.startsWith('/') && url.endsWith('.css'))
        .map((url) => `<link rel="stylesheet" href="${url}">`)
        .join('\n')

      return html.replace('</head>', `${links}</head>`)
    },
  }
}
