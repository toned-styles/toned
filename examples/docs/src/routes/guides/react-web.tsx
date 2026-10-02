import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { CodeBlock } from '../../components/CodeBlock.tsx'
import { InstallCommand } from '../../components/site/InstallCommand.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/react-web')({
  component: GuideReactWeb,
})

function GuideReactWeb() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>React Web Guide</h1>
      <p>
        This guide sets up Toned in a React web project with Vite and the
        ready-made base token vocabulary. With another bundler, generate the CSS
        in a build script instead; see{' '}
        <Link to="/guides/ssr" hash="without-vite">
          Without Vite
        </Link>
        .
      </p>

      <h2 {...s.h2} id="1-install-dependencies">
        1. Install Dependencies
      </h2>
      <InstallCommand packages="@toned/core @toned/react @toned/systems @toned/themes" />

      <h2 {...s.h2} id="2-compose-the-system">
        2. Compose the System
      </h2>
      <p>
        <code {...s.code}>@toned/systems/base</code> exports its token
        vocabulary. Compose it into a system of your own, in a pure module that
        both the build and the application import. The base tokens read
        unprefixed custom properties, which{' '}
        <code {...s.code}>@toned/themes</code> supplies, so this system has no
        namespace <code {...s.code}>id</code>:
      </p>
      <CodeBlock title="system.ts">{`import { defineSystem } from '@toned/core'
import { system as base } from '@toned/systems/base'

const { breakpoints, ...tokens } = base

export const ui = defineSystem(tokens, { breakpoints })
export const { stylesheet } = ui`}</CodeBlock>
      <p>
        A system of your own design follows{' '}
        <Link to="/getting-started">Getting Started</Link> instead.
      </p>

      <h2 {...s.h2} id="3-define-styles">
        3. Define Styles
      </h2>
      <p>
        Sheets import <code {...s.code}>stylesheet</code> from the system
        module. Keep them separate from components, so the build can collect
        them:
      </p>
      <CodeBlock title="styles/button.ts">{`import type { Variants } from '@toned/core'
import { stylesheet } from '../system.ts'

export const buttonStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    bgColor: 'action',
    borderRadius: 'medium',
    borderWidth: 'none',
    paddingX: 3,
    paddingY: 2,
    cursor: 'pointer',
  },
  Label: {
    $kind: 'text',
    textColor: 'on_action',
    typography: 'label-medium',
  },
}).variants(($: Variants<{
  variant: 'primary' | 'secondary'
}>) => ({
  [$.variant('secondary')]: {
    Root: {
      bgColor: 'action_secondary',
    },
    Label: {
      textColor: 'on_action_secondary',
    },
  },
}))`}</CodeBlock>

      <h2 {...s.h2} id="4-add-the-vite-plugin">
        4. Add the Vite Plugin
      </h2>
      <p>
        The Vite plugin generates the CSS and its manifest at build time. Pass
        the complete system and every sheet, including those of lazy routes, and
        list the declaration modules it should watch:
      </p>
      <CodeBlock title="vite.config.ts">{`import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buttonStyles } from './src/styles/button.ts'
import { ui } from './src/system.ts'

export default defineConfig({
  plugins: [
    toned({
      system: ui,
      sheets: [buttonStyles],
      inputs: ['src/system.ts', 'src/styles/button.ts'],
    }),
    react(),
  ],
})`}</CodeBlock>

      <h2 {...s.h2} id="5-provide-the-renderer">
        5. Provide the Renderer
      </h2>
      <p>
        Import the theme values and the generated CSS in your entry point,
        create a renderer from the system and the generated manifest, and
        provide it with the web host:
      </p>
      <CodeBlock title="main.tsx">{`import '@toned/themes/shadcn/config.css'
import 'virtual:toned.css'
import manifest from 'virtual:toned.manifest'
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { ui } from './system.ts'

const renderer = createWebRenderer(ui, { manifest })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonedProvider renderer={renderer} host={webHost}>
      <App />
    </TonedProvider>
  </StrictMode>,
)`}</CodeBlock>
      <CodeBlock title="env.d.ts">{`/// <reference types="vite/client" />
declare module 'virtual:toned.css' {}
declare module 'virtual:toned.manifest' {
  import type { BuildManifest } from '@toned/core/build'
  const manifest: BuildManifest
  export default manifest
}`}</CodeBlock>

      <h2 {...s.h2} id="6-use-styles-in-components">
        6. Use Styles in Components
      </h2>
      <p>
        Bind your stylesheet once, at module scope, with{' '}
        <code {...s.code}>createElements</code>. Variants go on the family
        provider; host props go on the parts:
      </p>
      <CodeBlock title="Button.tsx">{`import { createElements } from '@toned/react'
import { buttonStyles } from './styles/button.ts'

const S = createElements(buttonStyles)

export function Button({ label, variant = 'primary' }: {
  label: string
  variant?: 'primary' | 'secondary'
}) {
  return (
    <S variant={variant}>
      <S.Root as="button" type="button">
        <S.Label as="span">{label}</S.Label>
      </S.Root>
    </S>
  )
}`}</CodeBlock>

      <h2 {...s.h2} id="what-the-renderer-decides">
        What the Renderer Decides
      </h2>
      <p>
        The renderer owns the system, the output backend and the manifest check;
        the host owns refs, events and elements. Components choose no output
        mode. A web renderer emits class names for the generated CSS:
        breakpoints are CSS <code {...s.code}>@media</code> rules, and{' '}
        <code {...s.code}>:hover</code>, <code {...s.code}>:focus</code> and{' '}
        <code {...s.code}>:active</code> are CSS, with no JavaScript event
        listeners. See <Link to="/guides/interactive">Interactive Styles</Link>.
      </p>
      <p>
        List every sheet in the plugin&apos;s <code {...s.code}>sheets</code>:
        Toned never injects missing CSS at runtime, and the renderer diagnoses a
        condition absent from the manifest. The{' '}
        <Link
          to="/learn/$topic"
          params={{ topic: 'react' }}
          hash="explicit-renderer-configuration"
        >
          React reference
        </Link>{' '}
        covers themes, multiple systems and native hosts.
      </p>
    </article>
  )
}
