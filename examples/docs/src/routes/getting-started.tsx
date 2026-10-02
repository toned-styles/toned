import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { CodeBlock } from '../components/CodeBlock.tsx'
import { InstallCommand } from '../components/site/InstallCommand.tsx'
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
      <h2 {...s.h2} id="install">
        Install
      </h2>
      <p>
        <code {...s.code}>@toned/core</code> holds the system, stylesheets and
        the CSS build; <code {...s.code}>@toned/react</code> binds them to React
        18 or 19.
      </p>
      <InstallCommand packages="@toned/core @toned/react" />
      <p>
        Three more packages are optional:{' '}
        <code {...s.code}>@toned/systems</code> (a ready-made token vocabulary),{' '}
        <code {...s.code}>@toned/themes</code> (theme values for that
        vocabulary) and, as development dependencies,{' '}
        <code {...s.code}>@toned/eslint-plugin</code> and{' '}
        <code {...s.code}>@toned/compiler</code> (lint rules, the language
        server and the design tooling). The{' '}
        <Link to="/changelog">changelog</Link> lists what each release contains.
      </p>
      <h2 {...s.h2} id="declare-a-system-and-stylesheet">
        Declare a stylesheet
      </h2>
      <p>
        A stylesheet names the parts of a component, gives each part token
        values, and describes how they change per variant. It imports{' '}
        <code {...s.code}>stylesheet</code> from the system module defined
        further down.
      </p>
      <CodeBlock title="styles.ts">{`import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

export const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', background: 'accent' },
  Label: { $kind: 'text', text: 'label' },
}).variants(($: Variants<{ size: 's' | 'm' }>) => ({
  [$.size('s')]: { Root: { padding: 1 }, Label: { text: 'caption' } },
  [$.size('m')]: { Root: { padding: 2 } },
}), { defaults: { size: 'm' } })`}</CodeBlock>
      <h2 {...s.h2} id="render-the-parts">
        Render the parts
      </h2>
      <p>
        Bind the sheet once, at module scope. Variant values go on the family
        provider; host props go on the parts.
      </p>
      <CodeBlock title="Button.tsx">{`import { createElements } from '@toned/react'
import { buttonStyles } from './styles.ts'

const S = createElements(buttonStyles)

export function Button({ label, size = 'm' }: {
  label: string
  size?: 's' | 'm'
}) {
  return (
    <S size={size}>
      <S.Root as="button" type="button">
        <S.Label as="span">{label}</S.Label>
      </S.Root>
    </S>
  )
}`}</CodeBlock>
      <h2 {...s.h2} id="define-the-system">
        Define the system
      </h2>
      <p>
        The system holds the tokens the sheet used above. Keep it, like the
        sheets, in a pure module that both the build and the application import.
      </p>
      <CodeBlock title="system.ts">{`import { defineSystem, defineToken } from '@toned/core'

export const ui = defineSystem({
  id: 'example',
  tokens: {
    background: defineToken({
      values: ['neutral', 'accent'] as const,
      resolve: value => ({ backgroundColor: value === 'accent' ? '#315bd6' : '#eee' }),
    }),
    padding: defineToken({
      values: [1, 2, 3] as const,
      resolve: step => ({ padding: step * 4 }),
    }),
    text: defineToken({
      values: ['label', 'caption'] as const,
      resolve: value => ({ color: '#fff', fontSize: value === 'label' ? 14 : 12 }),
    }),
  },
})

export const { stylesheet } = ui`}</CodeBlock>
      <h2 {...s.h2} id="build-every-sheet">
        Build every sheet
      </h2>
      <p>
        The Vite plugin emits static CSS and a matching manifest. Include
        lazy-route sheets in the inventory too; rendering does not discover
        missing CSS.
      </p>
      <CodeBlock title="vite.config.ts">{`import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buttonStyles } from './styles.ts'
import { ui } from './system.ts'

export default defineConfig({
  plugins: [
    toned({ system: ui, sheets: [buttonStyles], inputs: ['system.ts', 'styles.ts'] }),
    react(),
  ],
})`}</CodeBlock>
      <p>
        Without Vite, call{' '}
        <code {...s.code}>buildStyles(ui, {'{ sheets }'})</code> from{' '}
        <code {...s.code}>@toned/core/build</code> in your build script and
        serve its CSS and manifest together.
      </p>
      <h2 {...s.h2} id="configure-and-render">
        Configure and render
      </h2>
      <p>
        The application creates one renderer from the system and the generated
        manifest, and provides it to the tree.
      </p>
      <CodeBlock title="App.tsx">{`import 'virtual:toned.css'
import manifest from 'virtual:toned.manifest'
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { Button } from './Button.tsx'
import { ui } from './system.ts'

const renderer = createWebRenderer(ui, { manifest })

export function App() {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      <Button label="Save" size="s" />
    </TonedProvider>
  )
}`}</CodeBlock>
      <CodeBlock title="env.d.ts">{`/// <reference types="vite/client" />
declare module 'virtual:toned.css' {}
declare module 'virtual:toned.manifest' {
  import type { BuildManifest } from '@toned/core/build'
  const manifest: BuildManifest
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
        <Link to="/api/use-styles">React bindings guide</Link> for their
        contracts.
      </p>
    </article>
  )
}
