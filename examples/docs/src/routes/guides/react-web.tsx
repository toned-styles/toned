import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
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
        This guide walks you through setting up toned-styles in a React web
        project using Vite. The same approach works with any bundler that
        supports TypeScript.
      </p>

      <h2 {...s.h2}>1. Install Dependencies</h2>
      <CodeBlock>
        {'npm install @toned/core @toned/react @toned/systems @toned/themes'}
      </CodeBlock>

      <h2 {...s.h2}>2. Add the Vite Plugin</h2>
      <p>
        The toned Vite plugin generates all token CSS at build time. Add it to
        your <code {...s.code}>vite.config.ts</code>:
      </p>
      <CodeBlock>{`// vite.config.ts
import toned from '@toned/core/vite'
import { system } from '@toned/systems/base'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [toned({ system }), react()],
})`}</CodeBlock>

      <h2 {...s.h2}>3. Create the Config File</h2>
      <p>
        Create <code {...s.code}>toned.config.ts</code> at your project root.
        This file must be imported before any component that uses toned styles:
      </p>
      <CodeBlock>{`// toned.config.ts
import '@toned/themes/shadcn/config.css'
import 'virtual:toned.css'

import { defineConfig, setConfig } from '@toned/core'
import reactConfig from '@toned/react/react-web'

export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,  // output className props
    useMedia: true,      // enable responsive breakpoints
    mediaMode: 'css',    // use real CSS @media rules
  }),
)`}</CodeBlock>

      <h2 {...s.h2}>4. Import Config in Your Entry Point</h2>
      <p>
        Import the config file at the very top of your entry point, before any
        component imports:
      </p>
      <CodeBlock>{`// main.tsx
import '../toned.config.ts'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`}</CodeBlock>

      <h2 {...s.h2}>5. Define Styles</h2>
      <p>
        Create a styles file using the <code {...s.code}>stylesheet</code>{' '}
        function from the base system. Keep style definitions separate from
        components for better reusability:
      </p>
      <CodeBlock>{`// styles/button.ts
import { stylesheet } from '@toned/systems/base'

export const buttonStyles = stylesheet({
  container: {
    bgColor: 'action',
    borderRadius: 'medium',
    borderWidth: 'none',
    paddingX: 3,
    paddingY: 2,
    cursor: 'pointer',
  },
  label: {
    textColor: 'on_action',
    typo: 'body',
  },
}).variants<{
  variant: 'primary' | 'secondary'
}>(($) => ({
  [$.variant('secondary')]: {
    container: {
      bgColor: 'action_secondary',
    },
    label: {
      textColor: 'on_action_secondary',
    },
  },
}))`}</CodeBlock>

      <h2 {...s.h2}>6. Use Styles in Components</h2>
      <p>
        Import your stylesheet and the <code {...s.code}>useStyles</code> hook.
        Spread the returned element props onto your JSX:
      </p>
      <CodeBlock>{`// Button.tsx
import { useStyles } from '@toned/react'
import { buttonStyles } from './styles/button.ts'

export function Button({ label, variant = 'primary' }: {
  label: string
  variant?: 'primary' | 'secondary'
}) {
  const s = useStyles(buttonStyles, { variant })
  return (
    <button type="button" {...s.container}>
      <span {...s.label}>{label}</span>
    </button>
  )
}`}</CodeBlock>

      <h2 {...s.h2}>Config Options</h2>
      <p>Key configuration options for web projects:</p>
      <p>
        <strong>useClassName: true</strong> -- Outputs{' '}
        <code {...s.code}>className</code> props alongside{' '}
        <code {...s.code}>style</code>. This enables CSS-based token resolution
        and is recommended for production web apps.
      </p>
      <p>
        <strong>useMedia: true</strong> -- Enables responsive breakpoint support
        in stylesheets.
      </p>
      <p>
        <strong>mediaMode: 'css'</strong> -- Compiles responsive breakpoints
        into native CSS <code {...s.code}>@media</code> rules rather than
        evaluating them in JavaScript.
      </p>
    </article>
  )
}
