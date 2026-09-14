import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/interactive')({
  component: GuideInteractive,
})

function GuideInteractive() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Interactive Styles</h1>
      <p>
        toned-styles supports hover, focus, and active states using
        colon-prefixed keys -- inside a stylesheet element definition, or inline
        with <code {...s.code}>t</code>. On the web with{' '}
        <code {...s.code}>pseudoMode: 'css'</code>, these work entirely through
        CSS with no JavaScript event listeners.
      </p>

      <h2 {...s.h2}>Element-Level Pseudo-Classes</h2>
      <p>
        Add <code {...s.code}>:hover</code>, <code {...s.code}>:focus</code>, or{' '}
        <code {...s.code}>:active</code> keys inside an element definition:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: {
    bgColor: 'action',
    borderRadius: 'medium',
    cursor: 'pointer',

    ':hover': {
      bgColor: 'action_secondary',
    },

    ':active': {
      bgColor: 'muted',
    },
  },
  label: {
    textColor: 'on_action',
  },
})`}</CodeBlock>

      <h2 {...s.h2}>Cross-Element Selectors</h2>
      <p>
        To change one element's styles when a different element is interacted
        with, use the <code {...s.code}>'element:pseudo'</code> key at the
        stylesheet root level:
      </p>
      <CodeBlock>{`const cardStyles = stylesheet({
  container: {
    bgColor: 'elevated',
    borderRadius: 'large',
    cursor: 'pointer',
  },
  label: {
    textColor: 'default',
  },
  icon: {
    textColor: 'muted',
  },

  // When 'container' is hovered, change styles on multiple elements
  'container:hover': {
    container: { shadow: 'medium' },
    label: { textColor: 'action' },
    icon: { textColor: 'action' },
  },
})`}</CodeBlock>
      <p>
        You can combine multiple pseudo-states in a cross-element selector:
      </p>
      <CodeBlock>{`'container:active:hover': {
  icon: { textColor: 'on_action' },
}`}</CodeBlock>

      <h2 {...s.h2}>Combining with Variants</h2>
      <p>
        Pseudo-classes work inside variant blocks, so different variants can
        define different interactive behaviour:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: { bgColor: 'action', borderRadius: 'medium' },
  label: { textColor: 'on_action' },
}).variants<{
  variant: 'accent' | 'danger'
}>(($) => ({
  [$.variant('accent')]: {
    container: {
      bgColor: 'action',
      ':hover': { bgColor: 'action_secondary' },
    },
  },
  [$.variant('danger')]: {
    container: {
      bgColor: 'status_error',
      ':hover': { bgColor: 'status_error', shadow: 'medium' },
    },
  },
}))
`}</CodeBlock>

      <h2 {...s.h2}>Combining with Breakpoints</h2>
      <p>
        Pseudo-classes and breakpoints compose naturally:
      </p>
      <CodeBlock>{`const navStyles = stylesheet({
  link: {
    textColor: 'muted',
    paddingX: 2,

    ':hover': {
      textColor: 'action',
    },

    '@md': {
      paddingX: 4,
    },
  },
})`}</CodeBlock>

      <h2 {...s.h2}>Inline Interactive Styles</h2>
      <p>
        The <code {...s.code}>t</code> utility accepts the same colon-prefixed
        keys, so a one-off element can be interactive without a stylesheet:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Tag() {
  return (
    <span
      {...t({
        bgColor: 'surface',
        ':hover': { bgColor: 'action' },
        '@md': { paddingX: 4 },
      })}
    />
  )
}`}</CodeBlock>
      <p>
        Inline blocks are one level deep, so the cross-element and variant forms
        above remain stylesheet-only. They also require{' '}
        <code {...s.code}>pseudoMode: 'css'</code> (and{' '}
        <code {...s.code}>mediaMode: 'css'</code> for the{' '}
        <code {...s.code}>@</code> form), because they compile to the custom
        property chains described below. Under any other mode the block is
        dropped, the base token value still applies, and a development-only
        warning names the option that would enable it.
      </p>

      <h2 {...s.h2}>React Native</h2>
      <p>
        React Native does not have CSS pseudo-classes. On native platforms,
        interactive states are handled through React Native's{' '}
        <code {...s.code}>Pressable</code> component. The same{' '}
        <code {...s.code}>:hover</code> and <code {...s.code}>:active</code>{' '}
        keys work in both environments when they are declared in a{' '}
        <a href="/api/stylesheet">stylesheet</a> and read with{' '}
        <a href="/api/use-styles">useStyles</a> -- the runtime behaviour adapts
        to each platform's capabilities.
      </p>
      <p>
        Inline <code {...s.code}>t</code> blocks are the exception. They have no
        native equivalent, since they rely on CSS custom properties, so on React
        Native they are dropped and the style degrades to its non-interactive
        base. Use a stylesheet for anything interactive that has to run on
        native.
      </p>

      <h2 {...s.h2}>Advanced: How It Works</h2>
      <p>
        On the web, interactive styles use the CSS "space toggle" technique.
        The system declares a custom property for each pseudo-state:
      </p>
      <CodeBlock>{`html {
  --toned_hover: initial;   /* "off" */
  --toned_focus: initial;
  --toned_active: initial;
}`}</CodeBlock>
      <p>
        When an element is hovered, a cascade rule flips the variable from{' '}
        <code {...s.code}>initial</code> (off) to an empty value (on):
      </p>
      <CodeBlock>{`/* Activate on the hovered element */
._:hover { --toned_hover: ; }

/* Reset for children so hover doesn't leak down */
._:hover ._ { --toned_hover: initial; }

/* Re-activate for nested elements that are themselves hovered */
._:hover ._:hover { --toned_hover: ; }`}</CodeBlock>
      <p>
        Token values then reference this variable in a{' '}
        <code {...s.code}>var()</code> fallback chain. When the variable is{' '}
        <code {...s.code}>initial</code>, the fallback (base value) is used.
        When it is empty, the hover value takes effect. This is the same
        mechanism that powers responsive breakpoints with{' '}
        <code {...s.code}>--media-md</code>, just triggered by CSS
        pseudo-classes instead of <code {...s.code}>@media</code> queries.
      </p>
      <p>
        Inline <code {...s.code}>t</code> styles emit the identical chain, just
        as element style properties rather than a generated class. A style
        carrying both a breakpoint and a pseudo override resolves to a single
        nested chain, with the interaction outermost so it wins:{' '}
        <code {...s.code}>
          padding: var(--toned_hover__padding, var(--media-md__padding, 8px))
        </code>
        .
      </p>
    </article>
  )
}
