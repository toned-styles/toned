import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/ssr')({ component: GuideSsr })

function GuideSsr() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Server rendering and Server Components</h1>
      <p>
        Toned works with server rendering, static generation and React Server
        Components. CSS is generated at build time, so the server sends complete
        markup with nothing to inject, and a Server Component can resolve its
        styles without hooks or client JavaScript.
      </p>
      <ul>
        <li>
          <strong>SSR and static generation:</strong> the same sheets, renderer
          inputs and theme produce the server markup and the first client
          render, so hydration matches.
        </li>
        <li>
          <strong>Server Components:</strong>{' '}
          <code {...s.code}>renderer.resolve(sheet)</code> returns plain props
          for each part. No hook, context or{' '}
          <code {...s.code}>'use client'</code> is needed.
        </li>
        <li>
          <strong>Client Components:</strong>{' '}
          <code {...s.code}>@toned/react</code> declares its own client
          boundary, so <code {...s.code}>createElements</code> families can be
          rendered from a Server Component.
        </li>
      </ul>
      <h2 {...s.h2} id="vite-delivery">
        Vite delivery
      </h2>
      <p>
        Pass the complete system returned by{' '}
        <code {...s.code}>defineSystem</code>
        and every sheet, including lazy routes. The raw token dictionary alone
        does not carry a stylesheet inventory or system namespace.
      </p>
      <p>
        <code {...s.code}>system.ts</code> and{' '}
        <code {...s.code}>styles.ts</code> are the modules from{' '}
        <a href="/getting-started">Getting Started</a>.
      </p>
      <CodeBlock title="vite.config.ts">{`import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buttonStyles } from './styles.ts'
import { ui } from './system.ts'

export default defineConfig({
  plugins: [toned({
    system: ui,
    sheets: [buttonStyles],
    inputs: ['system.ts', 'styles.ts'],
  }), react()],
})`}</CodeBlock>
      <p>
        Import <code {...s.code}>virtual:toned.css</code> in the application and
        use <code {...s.code}>virtual:toned.manifest</code> to create the
        renderer. See <a href="/getting-started">Getting Started</a> for the
        complete provider setup. The production CSS file must be linked from the
        initial HTML.
      </p>
      <h2 {...s.h2} id="without-vite">
        Without Vite
      </h2>
      <CodeBlock title="build-styles.ts">{`// Run during the application build.
import { mkdir, writeFile } from 'node:fs/promises'
import { buildStyles } from '@toned/core/build'
import { buttonStyles } from './styles.ts'
import { ui } from './system.ts'

const artifact = buildStyles(ui, { sheets: [buttonStyles] })
await mkdir('public/assets', { recursive: true })
await writeFile('public/assets/toned.css', artifact.css)
await writeFile('public/assets/toned.manifest.json', JSON.stringify(artifact.manifest))`}</CodeBlock>
      <p>
        Load that manifest into <code {...s.code}>createWebRenderer</code> and
        pass the renderer and web host to <code {...s.code}>TonedProvider</code>
        . Missing or stale build inputs are diagnosed instead of repaired by a
        browser-side injection fallback.
      </p>
      <h2 {...s.h2} id="render-and-hydrate">
        Render and hydrate
      </h2>
      <CodeBlock title="entry-server.tsx">{`import { renderToString } from 'react-dom/server'
import { App } from './App.tsx'
export function render() {
  return renderToString(<App />)
}`}</CodeBlock>
      <CodeBlock title="entry-client.tsx">{`import { hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'
const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
hydrateRoot(root, <App />)`}</CodeBlock>
      <p>
        For static generation, insert the rendered HTML into a template linking
        the generated stylesheet. Use matching theme values and variants for
        server output and hydration. Request-specific tokens belong in provider
        inputs, not mutations of a shared global configuration.
      </p>
      <h2 {...s.h2} id="server-components">
        React Server Components
      </h2>
      <p>
        A Server Component cannot use hooks or context. Create the renderer in a
        server module and resolve the sheet directly: the result is plain props
        for each part. Variants are ordinary arguments. Hover, focus and media
        conditions are CSS, so they work without any client JavaScript.
      </p>
      <CodeBlock title="SaveButton.tsx">{`// A Server Component: no 'use client', no hooks.
import { renderer } from './renderer.ts'
import { buttonStyles } from './styles.ts'

export function SaveButton({ size }: { size: 's' | 'm' }) {
  const s = renderer.resolve(buttonStyles, { variants: { size } })
  return (
    <button type="button" {...s.Root}>
      <span {...s.Label}>Save</span>
    </button>
  )
}`}</CodeBlock>
      <CodeBlock title="renderer.ts">{`import manifest from 'virtual:toned.manifest'
import { createWebRenderer } from '@toned/core/server'
import { ui } from './system.ts'

export const renderer = createWebRenderer(ui, { manifest, tokens: {} })`}</CodeBlock>
      <p>
        Use a Client Component when the styles depend on state held in the
        browser. <code {...s.code}>createElements</code> families are client
        components and can be imported into a Server Component as they are; they
        need a <code {...s.code}>TonedProvider</code> above them, as in{' '}
        <a href="/getting-started">Getting Started</a>.
      </p>
      <CodeBlock title="LikeButton.tsx">{`'use client'
import { createElements } from '@toned/react'
import { useState } from 'react'
import { buttonStyles } from './styles.ts'

const S = createElements(buttonStyles)

export function LikeButton() {
  const [liked, setLiked] = useState(false)
  return (
    <S size={liked ? 'm' : 's'}>
      <S.Root as="button" type="button" onClick={() => setLiked(!liked)}>
        <S.Label as="span">{liked ? 'Liked' : 'Like'}</S.Label>
      </S.Root>
    </S>
  )
}`}</CodeBlock>
      <h2 {...s.h2} id="pure-server-resolution">
        Pure server resolution
      </h2>
      <p>
        <code {...s.code}>@toned/core/server</code> can resolve part props
        without importing React, reading browser globals or mounting hosts.
        React SSR uses the separate React binding. Module-level{' '}
        <code {...s.code}>createElements</code>
        creates stable component identities without reading host configuration.
      </p>
      <p>
        <code {...s.code}>@toned/core/dev/inject</code> remains an explicit
        development helper. It is not the production or SSR delivery path.
      </p>
    </article>
  )
}
