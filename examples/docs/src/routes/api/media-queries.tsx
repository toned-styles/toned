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
        call <code {...s.code}>[q.media('md')]</code>, and the compatibility
        short key <code {...s.code}>'@md'</code> declares the same rule.
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
        <code {...s.code}>t</code> is the compatibility inline helper: it reads
        the installed configuration, and its blocks compile to CSS custom
        properties, so they apply only to web output with CSS media enabled.
        They are also one level deep, so the root-level and variant forms shown
        above apply to stylesheets only.
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
        How Breakpoints Apply
      </h2>
      <p>
        The renderer given to <code {...s.code}>TonedProvider</code> decides how
        a breakpoint is evaluated; the stylesheet is the same everywhere.
      </p>

      <h3 {...s.h3} id="css-mode">
        Web
      </h3>
      <p>
        A web renderer uses the CSS generated at build time, where each
        breakpoint is a real <code {...s.code}>@media</code> rule. Matching
        happens in the browser, with no JavaScript listener or React render:
      </p>
      <CodeBlock title="App.tsx">{`import 'virtual:toned.css'
import manifest from 'virtual:toned.manifest'
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { ui } from './system.ts'

const renderer = createWebRenderer(ui, { manifest })

export function App({ children }: { children: React.ReactNode }) {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      {children}
    </TonedProvider>
  )
}`}</CodeBlock>

      <h3 {...s.h3} id="javascript-mode">
        React Native
      </h3>
      <p>
        A native renderer evaluates a <strong>stylesheet</strong>&apos;s
        breakpoints against the viewport width the native host reports, and
        patches the mounted hosts when it changes. See the{' '}
        <Link to="/guides/react-native">React Native guide</Link> for the host
        capabilities this needs.
      </p>
      <p>
        Inline <code {...s.code}>t</code> blocks have no native equivalent: they
        compile to CSS custom properties, which only a browser reads. Without
        CSS media an inline <code {...s.code}>@</code> block is dropped, the
        base token value still applies, and a development-only warning explains
        why. Where you need responsive styling on React Native, use{' '}
        <Link to="/api/stylesheet">stylesheet</Link> with{' '}
        <Link to="/api/use-styles">useStyles</Link> instead.
      </p>
    </article>
  )
}
