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
      <h1 {...s.h1}>Server-Side Rendering</h1>
      <p>
        toned-styles supports SSR and static site generation (SSG) out of the
        box. The <code {...s.code}>useStyles</code> hook works identically on
        server and client, and the <code {...s.code}>generate</code> function
        lets you collect all CSS at build time or request time without a DOM.
      </p>

      <h2 {...s.h2}>Key APIs</h2>

      <h3 {...s.h3}>generate(system)</h3>
      <p>
        Returns all CSS rules for a design system as a string. This is the
        primary function for collecting styles on the server. It works in
        Node.js with no DOM dependency.
      </p>
      <CodeBlock>{`import { generate } from '@toned/core/dom'
import { system } from '@toned/systems/base'

const css = generate(system)
// → ".display_flex{display:flex}.bgColor_default{...}..."`}</CodeBlock>
      <p>
        The output includes class selectors for every static token value,
        breakpoint custom properties (<code {...s.code}>--media-*</code>), and
        pseudo-state rules (hover, focus, active).
      </p>

      <h3 {...s.h3}>inject(system)</h3>
      <p>
        Injects styles into the DOM at runtime. On the server it is a safe
        no-op -- it checks{' '}
        <code {...s.code}>typeof document === 'undefined'</code> and returns
        early. You can safely call it in shared config files that run on both
        server and client.
      </p>

      <h3 {...s.h3}>useStyles</h3>
      <p>
        The React hook is SSR-compatible. It reads from{' '}
        <code {...s.code}>getConfig()</code> (no DOM access) and uses{' '}
        <code {...s.code}>useRef</code> for caching. The same stylesheet and
        state always produce identical class names on server and client, so
        hydration matches.
      </p>

      <h2 {...s.h2}>SSR Setup</h2>
      <p>
        For server-side rendering on every request (e.g. a Node.js server with
        Vite), create a server entry point that renders the app and collects
        CSS:
      </p>

      <h3 {...s.h3}>1. Server Entry Point</h3>
      <CodeBlock>{`// src/entry-server.tsx
import '../toned.config.ts'

import { renderToString } from 'react-dom/server'
import { generate } from '@toned/core/dom'
import { system } from '@toned/systems/base'

export async function render(url: string) {
  // Render your app to HTML (router setup omitted for brevity)
  const html = renderToString(<App url={url} />)
  return html
}

export function generateCss() {
  return generate(system)
}`}</CodeBlock>
      <p>
        Import your <code {...s.code}>toned.config.ts</code> at the top so{' '}
        <code {...s.code}>setConfig</code> runs before any component renders.
        The <code {...s.code}>inject(system)</code> call inside the config is a
        no-op on the server.
      </p>

      <h3 {...s.h3}>2. HTML Template</h3>
      <p>
        Add placeholders to your <code {...s.code}>index.html</code> for the
        server to inject rendered HTML and collected CSS:
      </p>
      <CodeBlock>{`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!--app-head-->
  </head>
  <body>
    <div id="root"><!--app-html--></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`}</CodeBlock>

      <h3 {...s.h3}>3. SSR Dev Server</h3>
      <p>
        Use Vite's middleware mode to handle both asset serving and SSR in
        development:
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
  template = await vite.transformIndexHtml(url, template)

  const { render, generateCss } =
    await vite.ssrLoadModule('/src/entry-server.tsx')

  const appHtml = await render(url)
  const css = generateCss()

  const html = template
    .replace('<!--app-head-->',
      \`<style id="toned/main">\${css}</style>\`)
    .replace('<!--app-html-->', appHtml)

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(html)
}

const app = http.createServer((req, res) => {
  vite.middlewares(req, res, () => ssrHandler(req, res))
})

app.listen(5173)`}</CodeBlock>
      <p>
        Vite's middleware handles static assets, HMR, and source file requests.
        Anything it doesn't match falls through to{' '}
        <code {...s.code}>ssrHandler</code> which renders the page with full
        SSR.
      </p>

      <h3 {...s.h3}>4. Client Hydration</h3>
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
      <p>
        Checking <code {...s.code}>firstElementChild</code> lets the same
        client code work in both SSR and SPA modes.
      </p>

      <h2 {...s.h2}>Static Site Generation (SSG)</h2>
      <p>
        For static sites, prerender every route at build time. The process is
        the same as SSR but runs once during{' '}
        <code {...s.code}>pnpm build</code> and writes HTML files to disk:
      </p>
      <CodeBlock>{`// prerender.js
import fs from 'node:fs'
import path from 'node:path'

const routes = ['/', '/about', '/docs/getting-started']

async function prerender() {
  const template = fs.readFileSync('dist/client/index.html', 'utf-8')
  const { render, generateCss } =
    await import('./dist/server/entry-server.js')

  const css = generateCss()
  const head = \`<style id="toned/main">\${css}</style>\`

  for (const url of routes) {
    const appHtml = await render(url)
    const html = template
      .replace('<!--app-head-->', head)
      .replace('<!--app-html-->', appHtml)

    const filePath = url === '/'
      ? 'dist/client/index.html'
      : \`dist/client\${url}.html\`

    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, html)
  }
}

prerender()`}</CodeBlock>
      <p>
        Run both the client and server builds first, then the prerender script:
      </p>
      <CodeBlock>
        {'vite build --outDir dist/client && vite build --outDir dist/server --ssr src/entry-server.tsx && node prerender.js'}
      </CodeBlock>

      <h2 {...s.h2}>Theme CSS</h2>
      <p>
        If you use a theme like{' '}
        <code {...s.code}>@toned/themes/shadcn/config.css</code>, it is
        normally loaded via a JavaScript import. With SSR you need to include it
        in the generated output so styles work without client-side JavaScript:
      </p>
      <CodeBlock>{`// entry-server.tsx
import themeCss from '@toned/themes/shadcn/config.css?raw'
import { generate } from '@toned/core/dom'
import { system } from '@toned/systems/base'

export function generateCss() {
  return themeCss + generate(system)
}`}</CodeBlock>
      <p>
        The Vite <code {...s.code}>?raw</code> suffix imports the CSS file as a
        plain string so you can concatenate it with the generated token CSS.
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
        value), the server and client always produce identical markup. The
        inlined <code {...s.code}>{'<style id="toned/main">'}</code> tag
        contains the same CSS that{' '}
        <code {...s.code}>inject(system)</code> would create on the client, so
        there is no flash of unstyled content.
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
        <strong>Style element ID</strong> -- Both{' '}
        <code {...s.code}>inject()</code> and the SSR template use{' '}
        <code {...s.code}>id="toned/main"</code>. On the client,{' '}
        <code {...s.code}>inject()</code> finds the existing element and skips
        re-injection, so styles are not duplicated.
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
