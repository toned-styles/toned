import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/define-system')({
  component: ApiDefineSystem,
})

function ApiDefineSystem() {
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
        <strong>system</strong> -- The compiled system object. Pass this to
        the Vite plugin (<code {...s.code}>toned({'{ system }'})</code>) or to{' '}
        <code {...s.code}>inject(system)</code> for runtime CSS generation.
      </p>
      <p>
        <strong>stylesheet</strong> -- A factory function for creating type-safe
        stylesheets bound to this system's tokens. Every token property gets
        full autocompletion.
      </p>
      <p>
        <strong>t</strong> -- A utility for creating inline token styles. Useful
        for one-off styling without defining a full stylesheet. It accepts the
        same responsive and interactive blocks a stylesheet element does.
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
      <p>
        Multiple arguments merge left to right, so a later one overrides an
        earlier one. This is the usual way to layer a conditional style over a
        base:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Row({ selected }) {
  return <div {...t({ bgColor: 'surface' }, selected && { bgColor: 'action' })} />
}`}</CodeBlock>

      <h3 {...s.h3}>Breakpoint and Pseudo-State Blocks</h3>
      <p>
        <code {...s.code}>t</code> accepts the same nested{' '}
        <code {...s.code}>'@breakpoint'</code> and{' '}
        <code {...s.code}>':pseudo'</code> blocks as an element definition in a{' '}
        <a href="/api/stylesheet">stylesheet</a>, so an inline style can be
        responsive or interactive without reaching for one:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Card() {
  return (
    <div
      {...t({
        paddingX: 2,
        bgColor: 'surface',
        '@md': { paddingX: 4 },
        ':hover': { bgColor: 'action' },
      })}
    />
  )
}`}</CodeBlock>
      <p>
        Blocks are one level deep: a breakpoint block cannot contain another
        breakpoint, and neither can contain the cross-element{' '}
        <code {...s.code}>$element</code> references a stylesheet supports. Both
        kinds accept the <code {...s.code}>style</code> escape hatch, and when
        two arguments target the same block their properties merge rather than
        replace:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

// Both survive: { '@md': { paddingX: 4, gap: 1 } }
t({ '@md': { paddingX: 4 } }, { '@md': { gap: 1 } })`}</CodeBlock>
      <p>
        These blocks compile to CSS custom-property fallback chains, so they
        require <code {...s.code}>mediaMode: 'css'</code> and{' '}
        <code {...s.code}>pseudoMode: 'css'</code> respectively. Under any other
        mode -- including React Native -- the block is dropped, the base token
        value still applies, and a development-only warning names the config
        option that would enable it. See{' '}
        <a href="/api/media-queries">Media Queries</a> and{' '}
        <a href="/guides/interactive">Interactive Styles</a>.
      </p>
    </article>
  )
}
