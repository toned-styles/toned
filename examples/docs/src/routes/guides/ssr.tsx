import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/ssr')({ component: GuideSsr })

function GuideSsr() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>SSR and static generation</h1>
      <p>
        Generate CSS before rendering and deploy it with its validation
        manifest. The same immutable sheets, renderer inputs and theme produce
        the server markup and initial client render. Rendering never injects a
        stylesheet.
      </p>
      <h2 {...s.h2}>Vite delivery</h2>
      <p>
        Pass the complete system returned by{' '}
        <code {...s.code}>defineSystem</code>
        and every sheet, including lazy routes. The raw token dictionary alone
        does not carry a stylesheet inventory or system namespace.
      </p>
      <CodeBlock>{`// vite.config.ts
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { ui, buttonStyles } from './styles.ts'

export default defineConfig({
  plugins: [toned({
    system: ui,
    sheets: [buttonStyles],
    inputs: ['styles.ts'],
  }), react()],
})`}</CodeBlock>
      <p>
        Import <code {...s.code}>virtual:toned.css</code> in the application and
        use <code {...s.code}>virtual:toned.manifest</code> to create the
        renderer. See <a href="/">Getting Started</a> for the complete provider
        setup. The production CSS file must be linked from the initial HTML.
      </p>
      <h2 {...s.h2}>Without Vite</h2>
      <CodeBlock>{`// build-styles.ts — run during the application build
import { mkdir, writeFile } from 'node:fs/promises'
import { buildStyles } from '@toned/core/build'
import { ui, buttonStyles } from './styles.ts'

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
      <h2 {...s.h2}>Render and hydrate</h2>
      <CodeBlock>{`// entry-server.tsx
import { renderToString } from 'react-dom/server'
import { App } from './App.tsx'
export function render() {
  return renderToString(<App />)
}

// entry-client.tsx
import { hydrateRoot } from 'react-dom/client'
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
      <h2 {...s.h2}>Pure server resolution</h2>
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
