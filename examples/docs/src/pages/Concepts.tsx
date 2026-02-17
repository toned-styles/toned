import { useStyles } from '@toned/react'
import { CodeBlock } from '../components/CodeBlock.tsx'
import { proseStyles } from '../styles/prose.ts'

export function Concepts() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Core Concepts</h1>
      <p>
        toned-styles is built around four core ideas: design tokens, systems,
        stylesheets, and variants. Together they give you type-safe,
        cross-platform styling with a single authoring model.
      </p>

      <h2 {...s.h2}>Design Tokens</h2>
      <p>
        Tokens are the atomic building blocks of your design system. Each token
        maps a semantic name to one or more platform-specific values. For
        example, the <code {...s.code}>bgColor</code> token accepts values like{' '}
        <code {...s.code}>'action'</code>, <code {...s.code}>'muted'</code>, or{' '}
        <code {...s.code}>'elevated'</code>. On the web these resolve to CSS
        custom properties; on React Native they resolve to colour values
        directly.
      </p>
      <CodeBlock>{`// Tokens are used directly inside stylesheet definitions:
container: {
  bgColor: 'action',       // semantic background colour
  borderRadius: 'medium',  // semantic border radius
  paddingX: 3,             // spacing scale value
}`}</CodeBlock>
      <p>
        The base system ships with tokens for colour (
        <code {...s.code}>bgColor</code>, <code {...s.code}>textColor</code>,{' '}
        <code {...s.code}>borderColor</code>), borders (
        <code {...s.code}>borderRadius</code>,{' '}
        <code {...s.code}>borderWidth</code>), typography (
        <code {...s.code}>typo</code>), shadows (<code {...s.code}>shadow</code>
        ), layout (<code {...s.code}>paddingX</code>,{' '}
        <code {...s.code}>paddingY</code>, <code {...s.code}>gap</code>,{' '}
        <code {...s.code}>flexLayout</code>), and sizing (
        <code {...s.code}>width</code>, <code {...s.code}>height</code>).
      </p>

      <h2 {...s.h2}>Systems</h2>
      <p>
        A system is a collection of tokens plus configuration (breakpoints,
        selectors, rules). You create one with{' '}
        <code {...s.code}>defineSystem</code>:
      </p>
      <CodeBlock>{`import { defineSystem } from '@toned/core'

export const { system, stylesheet, t } = defineSystem(
  { ...typo, ...colour, ...border, ...layout, ...shadow, ...sizes },
  config,
)`}</CodeBlock>
      <p>
        The returned <code {...s.code}>stylesheet</code> function is bound to
        that system's token set, giving you full autocompletion and type
        checking for every token property.
      </p>

      <h2 {...s.h2}>Stylesheets</h2>
      <p>
        A stylesheet defines one or more named elements, each with a set of
        token values and an optional <code {...s.code}>style</code> escape hatch
        for raw CSS properties:
      </p>
      <CodeBlock>{`const cardStyles = stylesheet({
  card: {
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    style: {
      padding: '24px',
    },
  },
})`}</CodeBlock>
      <p>
        Stylesheets are plain objects until they are consumed by a framework
        adapter (like <code {...s.code}>useStyles</code> in React). This keeps
        your style definitions platform-agnostic.
      </p>

      <h2 {...s.h2}>Variants</h2>
      <p>
        Variants let you conditionally apply different token values based on
        component state. Chain <code {...s.code}>.variants()</code> onto a
        stylesheet and use the dollar-sign builder to declare variant
        conditions:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: { bgColor: 'action', borderRadius: 'medium' },
  label: { textColor: 'on_action' },
}).variants<{
  size: 'm' | 's'
  variant: 'accent' | 'danger'
}>(($) => ({
  [$.variant('accent')]: {
    container: { bgColor: 'action' },
    label: { textColor: 'on_action' },
  },
  [$.size('m')]: {
    container: { paddingX: 3 },
  },
  [$.size('s')]: {
    container: { paddingX: 2, paddingY: 1 },
  },
}))`}</CodeBlock>
      <p>
        Variant keys are fully typed: your component will get compile-time
        errors if it passes invalid variant values to{' '}
        <code {...s.code}>useStyles</code>.
      </p>

      <h2 {...s.h2}>Media Queries / Breakpoints</h2>
      <p>
        The base system defines breakpoints (<code {...s.code}>xs</code>,{' '}
        <code {...s.code}>sm</code>, <code {...s.code}>md</code>,{' '}
        <code {...s.code}>lg</code>, <code {...s.code}>xl</code>). You can apply
        responsive token values by prefixing a breakpoint name with{' '}
        <code {...s.code}>@</code>:
      </p>
      <CodeBlock>{`const responsiveCard = stylesheet({
  card: {
    paddingX: 2,
    '@md': {
      paddingX: 4,
    },
    '@lg': {
      paddingX: 6,
    },
  },
})`}</CodeBlock>
      <p>
        When <code {...s.code}>mediaMode</code> is set to{' '}
        <code {...s.code}>'css'</code> in your config, these generate real CSS{' '}
        <code {...s.code}>@media</code> rules. In JavaScript mode they are
        evaluated at runtime.
      </p>
    </article>
  )
}
