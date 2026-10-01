import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/media-queries')({
  component: ApiMediaQueries,
})

function ApiMediaQueries() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Media Queries</h1>
      <p>
        Toned supports responsive styling through breakpoints defined in your
        system configuration. Token values can be overridden at specific
        breakpoints, and the system handles media query generation
        automatically.
      </p>

      <h2 {...s.h2} id="using-breakpoints-in-stylesheets">
        Using Breakpoints in Stylesheets
      </h2>
      <p>
        Use an <code {...s.code}>@media</code> key that names a breakpoint to
        create a responsive override block inside any element definition:
      </p>
      <CodeBlock>{`const layoutStyles = stylesheet({
  Root: {
    paddingX: 2,
    flexLayout: 'column',

    '@media md': {
      paddingX: 4,
      flexLayout: 'row',
    },

    '@media lg': {
      paddingX: 6,
    },
  },
})`}</CodeBlock>
      <p>
        Breakpoint blocks support the same token properties and{' '}
        <code {...s.code}>$style</code> escape hatch as the base element
        definition. Properties set inside a breakpoint block override the base
        values when the viewport matches.
      </p>
      <p>
        <code {...s.code}>'@media md'</code> can also be written as the builder
        call <code {...s.code}>[q.media('md')]</code> or as the earlier short
        key <code {...s.code}>'@md'</code>; all three declare the same rule.
        Container and platform conditions follow the same pattern. See{' '}
        <Link to="/api/conditions">Conditions and selectors</Link> for every
        form.
      </p>

      <h2 {...s.h2} id="root-level-breakpoints">
        Root-Level Breakpoints
      </h2>
      <p>
        Breakpoints can be declared at the root level of a stylesheet to apply
        overrides across multiple elements at once. This is useful when a layout
        change at a given viewport affects several elements simultaneously:
      </p>
      <CodeBlock>{`const cardStyles = stylesheet({
  Root: {
    paddingX: 2,
    flexLayout: 'column',
  },
  Title: {
    $kind: 'text',
    typography: 'heading-3',
  },
  Sidebar: {
    display: 'none',
  },

  // At medium viewports, adjust multiple elements together
  '@media md': {
    Root: { paddingX: 4, flexLayout: 'row' },
    Title: { typography: 'heading-2' },
    Sidebar: { display: 'flex' },
  },

  '@media lg': {
    Root: { paddingX: 6 },
  },
})`}</CodeBlock>
      <p>
        Root-level and element-level breakpoints can be mixed freely. They
        produce the same result — root-level is shorthand for applying overrides
        to several elements under the same breakpoint.
      </p>

      <h2 {...s.h2} id="breakpoints-in-variants">
        Breakpoints in Variants
      </h2>
      <p>
        Responsive overrides work inside variant blocks too, letting you combine
        conditional and responsive styling. Breakpoints can be set on individual
        elements within a variant:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const styles = stylesheet({
  Root: { paddingX: 2, flexLayout: 'column', gap: 2 },
}).variants(($: Variants<{ layout: 'grid' | 'list' }>) => ({
  [$.layout('grid')]: {
    Root: {
      '@media md': {
        flexLayout: 'row',
        flexWrap: 'wrap',
      },
      '@media lg': {
        gap: 4,
      },
    },
  },
}))`}</CodeBlock>

      <h2 {...s.h2} id="using-breakpoints-inline">
        Using Breakpoints Inline
      </h2>
      <p>
        The <code {...s.code}>t</code> utility accepts the same{' '}
        <code {...s.code}>@media</code> blocks, so a one-off style can be
        responsive without defining a stylesheet:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Panel() {
  return <div {...t({ paddingX: 2, '@media md': { paddingX: 4 } })} />
}`}</CodeBlock>
      <p>
        Inline blocks require <code {...s.code}>mediaMode: 'css'</code> -- see
        below. They are also one level deep, so the root-level and variant forms
        shown above apply to stylesheets only.
      </p>
      <p>
        Give the property a base value, as <code {...s.code}>paddingX: 2</code>{' '}
        does above. A block with no base compiles to a fallback-less chain, so
        below the breakpoint the property resolves to its initial value rather
        than to whatever a class or an inherited rule set.
      </p>

      <h2 {...s.h2} id="breakpoints">
        Declaring Breakpoints
      </h2>
      <p>
        The examples above use the base system's breakpoints. In your own
        system, declare named viewport thresholds in logical pixels:
      </p>
      <CodeBlock title="system.ts">{`import { defineSystem } from '@toned/core'

export const ui = defineSystem({
  id: 'responsive',
  tokens: {},
  conditions: {
    media: {
      xs: 0,    // mobile-first default
      sm: 480,  // small phones landscape
      md: 768,  // tablets
      lg: 992,  // small desktops
      xl: 1200, // large desktops
    },
  },
})`}</CodeBlock>

      <h2 {...s.h2} id="media-modes">
        Media Modes
      </h2>
      <p>
        The <code {...s.code}>mediaMode</code> option in your config controls
        how responsive styles are applied:
      </p>

      <h3 {...s.h3} id="css-mode">
        CSS Mode
      </h3>
      <p>
        When <code {...s.code}>mediaMode: 'css'</code>, breakpoint overrides are
        compiled into real CSS <code {...s.code}>@media</code> rules. This is
        the recommended mode for web projects as it uses native browser
        capabilities and avoids JavaScript overhead:
      </p>
      <CodeBlock title="toned.config.ts">{`setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
    pseudoMode: 'css',
  }),
)`}</CodeBlock>

      <h3 {...s.h3} id="javascript-mode">
        JavaScript Mode
      </h3>
      <p>
        When <code {...s.code}>mediaMode</code> is not set to{' '}
        <code {...s.code}>'css'</code>, breakpoints in a{' '}
        <strong>stylesheet</strong> are evaluated at runtime using JavaScript{' '}
        <code {...s.code}>window.matchMedia</code>. This mode is useful for
        React Native or environments where CSS media queries are not available.
      </p>
      <p>
        Inline <code {...s.code}>t</code> blocks have no runtime equivalent:
        they compile to CSS custom properties, which only a browser reads. Under
        any mode other than <code {...s.code}>'css'</code> an inline{' '}
        <code {...s.code}>@</code> block is dropped, the base token value still
        applies, and a development-only warning explains why. Where you need
        responsive styling on React Native, use{' '}
        <Link to="/api/stylesheet">stylesheet</Link> with{' '}
        <Link to="/api/use-styles">useStyles</Link> instead.
      </p>
    </article>
  )
}
