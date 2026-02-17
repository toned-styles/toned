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
        The recommended approach uses the <code {...s.code}>@toned/core/vite</code>{' '}
        plugin to generate CSS at build time as a static file, eliminating
        the need for manual CSS collection on the server.
      </p>

      <h2 {...s.h2}>Vite Plugin (Recommended)</h2>
      <p>
        The toned Vite plugin generates all token CSS via a virtual module.
        In production, it becomes a static <code {...s.code}>.css</code> file
        in the bundle. In dev, it injects CSS into the HTML via{' '}
        <code {...s.code}>transformIndexHtml</code> to prevent FOUC.
      </p>

      <h3 {...s.h3}>1. Vite Config</h3>
      <p>
        Add the toned plugin to your Vite config, passing the system object:
      </p>
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
        Import the virtual module in your <code {...s.code}>toned.config.ts</code>{' '}
        instead of calling <code {...s.code}>inject()</code>:
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
        For TypeScript, add a reference to the virtual module type declaration
        in your <code {...s.code}>tsconfig.json</code> or use a{' '}
        <code {...s.code}>/// reference</code> directive:
      </p>
      <CodeBlock>{`// env.d.ts or any .d.ts file
/// <reference types="@toned/core/vite/client" />`}</CodeBlock>

      <h3 {...s.h3}>3. Server Entry Point</h3>
      <p>
        The server entry only needs to render the app. No CSS collection is
        required — the plugin handles it:
      </p>
      <CodeBlock>{`// src/entry-server.tsx
import '../toned.config.ts'

import { renderToString } from 'react-dom/server'

export async function render(url: string) {
  const html = renderToString(<App url={url} />)
  return html
}`}</CodeBlock>

      <h3 {...s.h3}>4. SSR Dev Server</h3>
      <p>
        The dev server calls <code {...s.code}>vite.transformIndexHtml</code>{' '}
        which triggers the plugin's CSS injection automatically:
      </p>
      <CodeBlock>{`// server.js
import fs from 'node:fs'
import http from 'node:http'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})

async function ssrHandler(req, res) {
  const url = req.originalUrl ?? req.url
  let template = fs.readFileSync(
    new URL('./index.html', import.meta.url), 'utf-8',
  )
  // Plugin injects toned CSS + theme CSS links here
  template = await vite.transformIndexHtml(url, template)

  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const appHtml = await render(url)

  const html = template.replace('<!--app-html-->', appHtml)

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(html)
}

const app = http.createServer((req, res) => {
  vite.middlewares(req, res, () => ssrHandler(req, res))
})

app.listen(5173)`}</CodeBlock>

      <h3 {...s.h3}>5. Client Hydration</h3>
      <p>
        On the client, detect whether the page was server-rendered and hydrate
        instead of creating a new root:
      </p>
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

      <h3 {...s.h3}>6. Prerendering (SSG)</h3>
      <p>
        For static sites, prerender routes at build time. With the Vite plugin,
        the production HTML already includes a{' '}
        <code {...s.code}>{'<link rel="stylesheet">'}</code> to the bundled CSS
        file, so the prerender script only needs to inject rendered HTML:
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
        If you are not using Vite, or prefer runtime CSS generation, you can
        use the <code {...s.code}>inject()</code> and{' '}
        <code {...s.code}>generate()</code> functions directly:
      </p>
      <CodeBlock>{`// toned.config.ts (runtime approach)
import '@toned/themes/shadcn/config.css'
import { defineConfig, setConfig } from '@toned/core'
import { inject } from '@toned/core/dom'
import reactConfig from '@toned/react/react-web'
import { system } from '@toned/systems/base'

inject(system)  // inserts <style> tag in the DOM; no-op on server

export default setConfig(
  defineConfig({ ...reactConfig, useClassName: true, useMedia: true, mediaMode: 'css' }),
)`}</CodeBlock>
      <p>
        With this approach, use <code {...s.code}>generate(system)</code> in
        your server entry to collect CSS as a string and inject it into the HTML
        template manually.
      </p>

      <h2 {...s.h2}>How It Works</h2>
      <p>
        The <code {...s.code}>generate</code> function walks every token in the
        system and emits a CSS class rule for each static value (e.g.{' '}
        <code {...s.code}>{'.bgColor_muted{...}'}</code>). It also emits:
      </p>
      <p>
        <strong>Breakpoint variables</strong> --{' '}
        <code {...s.code}>@media</code> rules that toggle{' '}
        <code {...s.code}>--media-sm</code>,{' '}
        <code {...s.code}>--media-md</code>, etc. from{' '}
        <code {...s.code}>initial</code> to an empty value. Responsive token
        classes reference these variables to activate at the right viewport
        width.
      </p>
      <p>
        <strong>Pseudo-state variables</strong> -- Rules that toggle{' '}
        <code {...s.code}>--toned_hover</code>,{' '}
        <code {...s.code}>--toned_focus</code>, and{' '}
        <code {...s.code}>--toned_active</code> for interactive styles.
      </p>
      <p>
        Because all class names are deterministic (derived from token key +
        value), the server and client always produce identical markup, so
        hydration matches without issues.
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
      <p>
        <strong>Dynamic token values are runtime-only</strong> -- Boxed{' '}
        <code {...s.code}>Number</code> and{' '}
        <code {...s.code}>String</code> token values are skipped by{' '}
        <code {...s.code}>generate()</code>. They resolve via inline styles at
        runtime, which still works with SSR since{' '}
        <code {...s.code}>useStyles</code> outputs them as{' '}
        <code {...s.code}>style</code> props.
      </p>
    </article>
  )
}
