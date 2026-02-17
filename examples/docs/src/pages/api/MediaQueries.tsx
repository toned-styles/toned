import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function ApiMediaQueries() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Media Queries</h1>
      <p>
        toned-styles supports responsive styling through breakpoints defined in
        your system configuration. Token values can be overridden at specific
        breakpoints, and the system handles media query generation
        automatically.
      </p>

      <h2 {...s.h2}>Breakpoints</h2>
      <p>The base system defines these breakpoints:</p>
      <CodeBlock>{`// From @toned/systems/base/config.ts
export const breakpoints = defineBreakpoints({
  xs: 0,    // mobile-first default
  sm: 480,  // small phones landscape
  md: 768,  // tablets
  lg: 992,  // small desktops
  xl: 1200, // large desktops
})`}</CodeBlock>

      <h2 {...s.h2}>Using Breakpoints in Stylesheets</h2>
      <p>
        Prefix a breakpoint name with <code {...s.code}>@</code> to create a
        responsive override block inside any element definition:
      </p>
      <CodeBlock>{`const layoutStyles = stylesheet({
  container: {
    paddingX: 2,
    style: {
      display: 'flex',
      flexDirection: 'column',
    },

    '@md': {
      paddingX: 4,
      style: {
        flexDirection: 'row',
      },
    },

    '@lg': {
      paddingX: 6,
    },
  },
})`}</CodeBlock>
      <p>
        Breakpoint blocks support the same token properties and{' '}
        <code {...s.code}>style</code> escape hatch as the base element
        definition. Properties set inside a breakpoint block override the base
        values when the viewport matches.
      </p>

      <h2 {...s.h2}>Media Modes</h2>
      <p>
        The <code {...s.code}>mediaMode</code> option in your config controls
        how responsive styles are applied:
      </p>

      <h3 {...s.h3}>CSS Mode</h3>
      <p>
        When <code {...s.code}>mediaMode: 'css'</code>, breakpoint overrides are
        compiled into real CSS <code {...s.code}>@media</code> rules. This is
        the recommended mode for web projects as it uses native browser
        capabilities and avoids JavaScript overhead:
      </p>
      <CodeBlock>{`setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
  }),
)`}</CodeBlock>

      <h3 {...s.h3}>JavaScript Mode</h3>
      <p>
        When <code {...s.code}>mediaMode</code> is not set to{' '}
        <code {...s.code}>'css'</code>, breakpoints are evaluated at runtime
        using JavaScript <code {...s.code}>window.matchMedia</code>. This mode
        is useful for React Native or environments where CSS media queries are
        not available.
      </p>

      <h2 {...s.h2}>Breakpoints in Variants</h2>
      <p>
        Responsive overrides also work inside variant blocks, letting you
        combine conditional and responsive styling:
      </p>
      <CodeBlock>{`const styles = stylesheet({
  container: { paddingX: 2 },
}).variants<{ layout: 'grid' | 'list' }>(($) => ({
  [$.layout('grid')]: {
    container: {
      style: { display: 'grid', gridTemplateColumns: '1fr' },
      '@md': {
        style: { gridTemplateColumns: '1fr 1fr' },
      },
      '@lg': {
        style: { gridTemplateColumns: '1fr 1fr 1fr' },
      },
    },
  },
}))`}</CodeBlock>
    </article>
  )
}
