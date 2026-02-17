import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../components/CodeBlock.tsx'
import { proseStyles } from '../styles/prose.ts'

export const Route = createFileRoute('/')({
  component: GettingStarted,
})

function GettingStarted() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Getting Started</h1>
      <p>
        toned-styles is a cross-platform styling system for React that uses
        design tokens and type-safe variants. It works with both React Web (DOM)
        and React Native, letting you share styling logic across platforms while
        outputting optimised, platform-native styles.
      </p>

      <h2 {...s.h2}>Installation</h2>
      <p>Install the core packages with your preferred package manager:</p>
      <CodeBlock>
        {'npm install @toned/core @toned/react @toned/systems'}
      </CodeBlock>
      <p>
        For web projects you will also need the DOM injection helper and a
        theme. The shadcn theme ships as a ready-made set of CSS custom
        properties:
      </p>
      <CodeBlock>{'npm install @toned/themes'}</CodeBlock>

      <h2 {...s.h2}>Project Setup</h2>
      <p>
        Create a <code {...s.code}>toned.config.ts</code> file at the root of
        your project. This file initialises the styling system, injects the CSS
        runtime, and sets the active configuration:
      </p>
      <CodeBlock>{`import '@toned/themes/shadcn/config.css'

import { defineConfig, setConfig } from '@toned/core'
import { inject } from '@toned/core/dom'
import reactConfig from '@toned/react/react-web'
import { system } from '@toned/systems/base'

// Inject CSS rules for every token in the system
inject(system)

// Activate the configuration
export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
  }),
)`}</CodeBlock>

      <h2 {...s.h2}>Your First Component</h2>
      <p>
        Import <code {...s.code}>stylesheet</code> from the base system to
        define element styles using design tokens, then use{' '}
        <code {...s.code}>useStyles</code> in your React component to apply
        them:
      </p>
      <CodeBlock>{`// styles.ts
import { stylesheet } from '@toned/systems/base'

export const buttonStyles = stylesheet({
  container: {
    bgColor: 'action',
    borderRadius: 'medium',
    borderWidth: 'none',
    cursor: 'pointer',
  },
  label: {
    textColor: 'on_action',
  },
})`}</CodeBlock>
      <CodeBlock>{`// Button.tsx
import { useStyles } from '@toned/react'
import { buttonStyles } from './styles.ts'

export function Button({ label }: { label: string }) {
  const s = useStyles(buttonStyles)
  return (
    <button type="button" {...s.container}>
      <span {...s.label}>{label}</span>
    </button>
  )
}`}</CodeBlock>
      <p>
        The <code {...s.code}>useStyles</code> hook returns an object whose keys
        match the element names you defined in the stylesheet. Spreading these
        onto JSX elements applies the corresponding{' '}
        <code {...s.code}>style</code> and <code {...s.code}>className</code>{' '}
        props automatically.
      </p>

      <h2 {...s.h2}>Next Steps</h2>
      <p>
        Read the <a href="/concepts">Core Concepts</a> page to understand how
        tokens, stylesheets, and variants fit together. Then explore the{' '}
        <a href="/guides/react-web">React Web</a> or{' '}
        <a href="/guides/react-native">React Native</a> guides for
        platform-specific setup instructions.
      </p>
    </article>
  )
}
