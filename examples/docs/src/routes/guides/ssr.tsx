import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/ssr')({
  component: GuideSsr,
})

function GuideSsr() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>SSR &amp; SSG</h1>
      <p>
        toned-styles supports SSR and static site generation out of the box.
        The recommended approach uses the{' '}
        <code {...s.code}>@toned/core/vite</code> plugin to generate CSS at
        build time, eliminating the need for manual CSS collection on the
        server.
      </p>

      <h2 {...s.h2}>Vite Plugin (Recommended)</h2>
      <p>
        The toned Vite plugin generates all token CSS via a virtual module. In
        production it becomes a static <code {...s.code}>.css</code> file in
        the bundle.
      </p>

      <h3 {...s.h3}>1. Vite Config</h3>
      <CodeBlock>{`// vite.config.ts
import toned from '@toned/core/vite'
import { system } from '@toned/systems/base'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [toned({ system }), react()],
})`}</CodeBlock>

      <h3 {...s.h3}>2. Config File</h3>
      <p>
        Import the virtual module in your{' '}
        <code {...s.code}>toned.config.ts</code>:
      </p>
      <CodeBlock>{`// toned.config.ts
import '@toned/themes/shadcn/config.css'
import 'virtual:toned.css'

import { defineConfig, setConfig } from '@toned/core'
import reactConfig from '@toned/react/react-web'

export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
  }),
)`}</CodeBlock>
      <p>
        For TypeScript, add a type reference for the virtual module:
      </p>
      <CodeBlock>{`// env.d.ts
/// <reference types="@toned/core/vite/client" />`}</CodeBlock>

      <h3 {...s.h3}>3. Server Entry</h3>
      <p>
        The server entry only needs to render the app — the plugin handles CSS:
      </p>
      <CodeBlock>{`// src/entry-server.tsx
import '../toned.config.ts'

import { renderToString } from 'react-dom/server'

export async function render(url: string) {
  const html = renderToString(<App url={url} />)
  return html
}`}</CodeBlock>

      <h3 {...s.h3}>4. Client Hydration</h3>
      <CodeBlock>{`// src/main.tsx
import '../toned.config.ts'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

const rootEl = document.getElementById('root')!

if (rootEl.firstElementChild) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}`}</CodeBlock>

      <h3 {...s.h3}>5. Prerendering (SSG)</h3>
      <p>
        For static sites, prerender routes at build time. The production HTML
        already includes a{' '}
        <code {...s.code}>{'<link rel="stylesheet">'}</code> to the bundled CSS,
        so the prerender script only injects rendered HTML:
      </p>
      <CodeBlock>{`// prerender.js
import fs from 'node:fs'
import path from 'node:path'

const routes = ['/', '/about', '/docs/getting-started']

async function prerender() {
  const template = fs.readFileSync('dist/client/index.html', 'utf-8')
  const { render } = await import('./dist/server/entry-server.js')

  for (const url of routes) {
    const appHtml = await render(url)
    const html = template.replace('<!--app-html-->', appHtml)

    const filePath = url === '/'
      ? 'dist/client/index.html'
      : \`dist/client\${url}.html\`

    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, html)
  }
}

prerender()`}</CodeBlock>

      <h2 {...s.h2}>Alternative: Runtime inject()</h2>
      <p>
        If you are not using Vite, you can use{' '}
        <code {...s.code}>inject()</code> to generate CSS at runtime:
      </p>
      <CodeBlock>{`// toned.config.ts (runtime approach)
import '@toned/themes/shadcn/config.css'
import { defineConfig, setConfig } from '@toned/core'
import { inject } from '@toned/core/dom'
import reactConfig from '@toned/react/react-web'
import { system } from '@toned/systems/base'

inject(system)  // inserts <style> tag in the DOM

export default setConfig(
  defineConfig({ ...reactConfig, useClassName: true, useMedia: true, mediaMode: 'css' }),
)`}</CodeBlock>
      <p>
        With this approach, use <code {...s.code}>generate(system)</code> in
        your server entry to collect CSS as a string and inject it into the HTML
        template manually.
      </p>

      <h2 {...s.h2}>Caveats</h2>
      <p>
        <strong>Config must load before rendering</strong> -- Import{' '}
        <code {...s.code}>toned.config.ts</code> at the top of your server
        entry so <code {...s.code}>setConfig</code> runs before any{' '}
        <code {...s.code}>useStyles</code> call.
      </p>
      <p>
        <strong>Same config on both sides</strong> -- The server and client must
        run the same configuration. Any differences will cause hydration
        mismatches.
      </p>
    </article>
  )
}
