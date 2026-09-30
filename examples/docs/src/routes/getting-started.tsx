import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../components/CodeBlock.tsx'
import { proseStyles } from '../styles/prose.ts'

export const Route = createFileRoute('/getting-started')({
  component: GettingStarted,
})

function GettingStarted() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Getting Started</h1>
      <p>
        Toned combines typed design tokens, named parts and variants. React
        element families keep component identities stable while each mounted
        instance owns its styling state. Web styles are generated before
        rendering.
      </p>
      <h2 {...s.h2}>Choose a release</h2>
      <p>
        This site describes the development branch, including APIs that are not
        in the latest npm release. To try everything shown here, use the source
        checkout below. The npm command installs the published packages; use
        their bundled reference for that release.
      </p>
      <pre {...s.codeBlock}>
        <code>{`git clone --branch feat/toned-style-showcase https://github.com/toned-styles/toned.git
cd toned
pnpm install
pnpm --filter @examples/docs dev`}</code>
      </pre>
      <p>
        The docs application is a complete working Vite example. Its package
        references and sheet inventory match this checkout. If Toned is embedded
        in another workspace, install from that workspace root instead.
      </p>
      <h2 {...s.h2}>Published packages</h2>
      <CodeBlock>{'npm install @toned/core @toned/react'}</CodeBlock>
      <h2 {...s.h2}>Declare a system and stylesheet</h2>
      <p>
        Keep declarations in a pure module that both the build and application
        import.
      </p>
      <CodeBlock>{`// styles.ts
import { defineSystem, defineToken, type Variants } from '@toned/core'

export const ui = defineSystem({
  id: 'example',
  tokens: {
    background: defineToken({
      values: ['neutral', 'accent'] as const,
      resolve: value => ({ backgroundColor: value === 'accent' ? '#315bd6' : '#eee' }),
    }),
  },
})
export const buttonStyles = ui.stylesheet({
  Root: { $kind: 'pressable', background: 'accent' },
  Label: { $kind: 'text', $style: { fontSize: 14 } },
}).variants(($: Variants<{ size: 's' | 'm' }>) => ({
  [$.size('s')]: { Root: { $style: { padding: 4 } } },
  [$.size('m')]: { Root: { $style: { padding: 8 } } },
}), { defaults: { size: 'm' } })`}</CodeBlock>
      <h2 {...s.h2}>Build every sheet</h2>
      <p>
        The Vite plugin emits static CSS and a matching manifest. Include
        lazy-route sheets in the inventory too; rendering does not discover
        missing CSS.
      </p>
      <CodeBlock>{`// vite.config.ts
import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { ui, buttonStyles } from './styles.ts'

export default defineConfig({
  plugins: [toned({ system: ui, sheets: [buttonStyles], inputs: ['styles.ts'] }), react()],
})`}</CodeBlock>
      <p>
        Without Vite, call{' '}
        <code {...s.code}>buildStyles(ui, {'{ sheets }'})</code> from{' '}
        <code {...s.code}>@toned/core/build</code> in your build script and
        serve its CSS and manifest together.
      </p>
      <h2 {...s.h2}>Configure and render</h2>
      <CodeBlock>{`// App.tsx
import 'virtual:toned.css'
import manifest from 'virtual:toned.manifest'
import { createWebRenderer } from '@toned/core/server'
import { createElements, TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { ui, buttonStyles } from './styles.ts'

const renderer = createWebRenderer(ui, { manifest, tokens: {} })
const S = createElements(buttonStyles)

export function App() {
  return <TonedProvider renderer={renderer} host={webHost}>
    <S size="s">
      <S.Root as="button" type="button"><S.Label as="span">Save</S.Label></S.Root>
    </S>
  </TonedProvider>
}`}</CodeBlock>
      <CodeBlock>{`// env.d.ts
/// <reference types="vite/client" />
declare module 'virtual:toned.css' {}
declare module 'virtual:toned.manifest' {
  const manifest: import('@toned/core/build').BuildManifest
  export default manifest
}`}</CodeBlock>
      <p>
        The family provider adds no DOM element. Independent parts can render
        standalone with base/default styles; use the provider for variant
        inputs, cross-part states, and grid ownership. Sibling providers remain
        isolated.
      </p>
      <p>
        <code {...s.code}>useStyles</code> prop bags and the existing{' '}
        <code {...s.code}>useBind</code> API remain supported. See the{' '}
        <a href="/api/use-styles">React bindings guide</a> for their contracts.
      </p>
    </article>
  )
}
