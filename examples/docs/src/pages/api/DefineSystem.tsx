import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function ApiDefineSystem() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>defineSystem</h1>
      <p>
        <code {...s.code}>defineSystem</code> creates a styling system from a
        set of token definitions and configuration. It is the foundation of
        every toned-styles project.
      </p>

      <h2 {...s.h2}>Signature</h2>
      <CodeBlock>{`import { defineSystem } from '@toned/core'

const { system, stylesheet, t } = defineSystem(tokens, config)`}</CodeBlock>

      <h3 {...s.h3}>Parameters</h3>
      <p>
        <strong>tokens</strong> -- An object whose values are token definitions
        created with <code {...s.code}>defineToken</code> or{' '}
        <code {...s.code}>defineCssToken</code>. Each token describes a semantic
        property (e.g. <code {...s.code}>bgColor</code>,{' '}
        <code {...s.code}>paddingX</code>) and its allowed values.
      </p>
      <p>
        <strong>config</strong> -- System configuration including breakpoints.
        The base system ships with <code {...s.code}>xs</code> (0),{' '}
        <code {...s.code}>sm</code> (480), <code {...s.code}>md</code> (768),{' '}
        <code {...s.code}>lg</code> (992), and <code {...s.code}>xl</code>{' '}
        (1200).
      </p>

      <h3 {...s.h3}>Return Value</h3>
      <p>An object with three properties:</p>
      <p>
        <strong>system</strong> -- The compiled system object. Pass this to{' '}
        <code {...s.code}>inject(system)</code> to generate CSS rules on the
        web.
      </p>
      <p>
        <strong>stylesheet</strong> -- A factory function for creating type-safe
        stylesheets bound to this system's tokens. Every token property gets
        full autocompletion.
      </p>
      <p>
        <strong>t</strong> -- A utility for creating inline token styles. Useful
        for one-off styling without defining a full stylesheet.
      </p>

      <h2 {...s.h2}>Example</h2>
      <CodeBlock>{`import { defineSystem } from '@toned/core'
import * as colour from './colour.ts'
import * as border from './border.ts'
import * as layout from './layout.ts'
import * as config from './config.ts'

export const { system, stylesheet, t } = defineSystem(
  {
    ...colour,
    ...border,
    ...layout,
  },
  config,
)`}</CodeBlock>

      <h2 {...s.h2}>Using the t Utility</h2>
      <p>
        The <code {...s.code}>t</code> function lets you apply tokens inline
        without defining a stylesheet. This is handy for one-off styles:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Heading() {
  return <h1 {...t({ typo: 'heading_1' })}>Hello</h1>
}`}</CodeBlock>
    </article>
  )
}
