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
        This guide walks you through setting up Toned in a React web project
        using Vite. The same approach works with any bundler that supports
        TypeScript.
      </p>

      <h2 {...s.h2} id="1-install-dependencies">
        1. Install Dependencies
      </h2>
      <InstallCommand packages="@toned/core @toned/react @toned/systems @toned/themes" />

      <h2 {...s.h2} id="2-add-the-vite-plugin">
        2. Add the Vite Plugin
      </h2>
      <p>
        The toned Vite plugin generates all token CSS at build time. Add it to
        your <code {...s.code}>vite.config.ts</code>:
      </p>
      <CodeBlock title="vite.config.ts">{`import toned from '@toned/core/vite'
import { system } from '@toned/systems/base'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [toned({ system }), react()],
})`}</CodeBlock>

      <h2 {...s.h2} id="3-create-the-config-file">
        3. Create the Config File
      </h2>
      <p>
        Create <code {...s.code}>toned.config.ts</code> at your project root.
        This file must be imported before any component that uses toned styles:
      </p>
      <CodeBlock title="toned.config.ts">{`import '@toned/themes/shadcn/config.css'
import 'virtual:toned.css'

import { defineConfig, setConfig } from '@toned/core'
import reactConfig from '@toned/react/react-web'

export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,  // output className props
    useMedia: true,      // enable responsive breakpoints
    mediaMode: 'css',    // use real CSS @media rules
    pseudoMode: 'css',   // resolve :hover/:focus/:active in CSS
  }),
)`}</CodeBlock>

      <h2 {...s.h2} id="4-import-config-in-your-entry-point">
        4. Import Config in Your Entry Point
      </h2>
      <p>
        Import the config file at the very top of your entry point, before any
        component imports:
      </p>
      <CodeBlock title="main.tsx">{`import '../toned.config.ts'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`}</CodeBlock>

      <h2 {...s.h2} id="5-define-styles">
        5. Define Styles
      </h2>
      <p>
        Create a styles file using the <code {...s.code}>stylesheet</code>{' '}
        function from the base system. Keep style definitions separate from
        components for better reusability:
      </p>
      <CodeBlock title="styles/button.ts">{`import type { Variants } from '@toned/core'
import { stylesheet } from '@toned/systems/base'

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

      <h2 {...s.h2} id="config-options">
        Config Options
      </h2>
      <p>Key configuration options for web projects:</p>
      <p>
        <strong>useClassName: true</strong> -- Outputs{' '}
        <code {...s.code}>className</code> props alongside{' '}
        <code {...s.code}>style</code>. This enables CSS-based token resolution
        and is recommended for production web apps.
      </p>
      <p>
        <strong>useMedia: true</strong> -- Enables responsive breakpoint
        support.
      </p>
      <p>
        <strong>mediaMode: 'css'</strong> -- Compiles responsive breakpoints
        into native CSS <code {...s.code}>@media</code> rules rather than
        evaluating them in JavaScript. Also required for{' '}
        <code {...s.code}>@</code> blocks in inline <code {...s.code}>t</code>{' '}
        styles, which have no JavaScript equivalent.
      </p>
      <p>
        <strong>pseudoMode: 'css'</strong> -- Resolves{' '}
        <code {...s.code}>:hover</code>, <code {...s.code}>:focus</code> and{' '}
        <code {...s.code}>:active</code> through CSS custom properties instead
        of JavaScript event listeners. See{' '}
        <Link to="/guides/interactive">Interactive Styles</Link>.
      </p>
    </article>
  )
}
