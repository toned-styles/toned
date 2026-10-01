import { createFileRoute, Link } from '@tanstack/react-router'
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
        Toned supports hover, focus, and active states using colon-prefixed keys
        -- inside a stylesheet element definition, or inline with{' '}
        <code {...s.code}>t</code>. On the web with{' '}
        <code {...s.code}>pseudoMode: 'css'</code>, these work entirely through
        CSS with no JavaScript event listeners.
      </p>

      <h2 {...s.h2} id="element-level-pseudo-classes">
        Element-Level Pseudo-Classes
      </h2>
      <p>
        Add <code {...s.code}>:hover</code>, <code {...s.code}>:focus</code>, or{' '}
        <code {...s.code}>:active</code> keys inside an element definition:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  Root: {
    $kind: 'pressable',
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
  Label: {
    $kind: 'text',
    textColor: 'on_action',
  },
})`}</CodeBlock>

      <p>
        <code {...s.code}>':focus-visible'</code> and{' '}
        <code {...s.code}>':focus-within'</code> are written the same way, as
        are states the system declares itself, such as{' '}
        <code {...s.code}>':open'</code>.{' '}
        <Link to="/api/conditions" hash="states">
          Conditions and selectors
        </Link>{' '}
        lists them with their builder forms.
      </p>

      <h2 {...s.h2} id="cross-element-selectors">
        Cross-Element Selectors
      </h2>
      <p>
        To change one element's styles when a different element is interacted
        with, use a <code {...s.code}>'Part:state'</code> key at the stylesheet
        root level:
      </p>
      <CodeBlock>{`const cardStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    bgColor: 'elevated',
    borderRadius: 'large',
    cursor: 'pointer',
  },
  Label: {
    $kind: 'text',
    textColor: 'default',
  },
  Icon: {
    $kind: 'text',
    textColor: 'muted',
  },

  // When Root is hovered, change styles on multiple parts
  'Root:hover': {
    Root: { shadow: 'medium' },
    Label: { textColor: 'action' },
    Icon: { textColor: 'action' },
  },
})`}</CodeBlock>
      <p>You can combine multiple pseudo-states in a cross-element selector:</p>
      <CodeBlock>{`'Root:active:hover': {
  Icon: { textColor: 'on_action' },
}`}</CodeBlock>

      <h2 {...s.h2} id="combining-with-variants">
        Combining with Variants
      </h2>
      <p>
        Pseudo-classes work inside variant blocks, so different variants can
        define different interactive behaviour:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', bgColor: 'action', borderRadius: 'medium' },
  Label: { $kind: 'text', textColor: 'on_action' },
}).variants(($: Variants<{
  variant: 'accent' | 'danger'
}>) => ({
  [$.variant('accent')]: {
    Root: {
      ':hover': { bgColor: 'action_secondary' },
    },
  },
  [$.variant('danger')]: {
    Root: {
      bgColor: 'destructive',
      ':hover': { shadow: 'medium' },
    },
    Label: { textColor: 'on_destructive' },
  },
}))
`}</CodeBlock>

      <h2 {...s.h2} id="combining-with-breakpoints">
        Combining with Breakpoints
      </h2>
      <p>Pseudo-classes and breakpoints compose naturally:</p>
      <CodeBlock>{`const navStyles = stylesheet({
  Link: {
    $kind: 'text',
    textColor: 'muted',
    paddingX: 2,

    ':hover': {
      textColor: 'action',
    },

    '@media md': {
      paddingX: 4,
    },
  },
})`}</CodeBlock>

      <h2 {...s.h2} id="inline-interactive-styles">
        Inline Interactive Styles
      </h2>
      <p>
        The <code {...s.code}>t</code> utility accepts the same colon-prefixed
        keys, so a one-off element can be interactive without a stylesheet:
      </p>
      <CodeBlock>{`import { t } from '@toned/systems/base'

function Tag() {
  return (
    <span
      {...t({
        bgColor: 'default',
        paddingX: 2,
        ':hover': { bgColor: 'action' },
        '@media md': { paddingX: 4 },
      })}
    />
  )
}`}</CodeBlock>
      <p>
        Cross-element relationships and variant selection in the examples above
        require a stylesheet. This compatibility t helper requires{' '}
        <code {...s.code}>pseudoMode: 'css'</code> (and{' '}
        <code {...s.code}>mediaMode: 'css'</code> for the{' '}
        <code {...s.code}>@</code> form), because they compile to the custom
        property chains described below. Under any other mode the block is
        dropped, the base token value still applies, so use the explicit
        renderer APIs for new integrations.
      </p>

      <h2 {...s.h2} id="react-native">
        React Native
      </h2>
      <p>
        React Native does not have CSS pseudo-classes. On native platforms,
        interactive states are handled through React Native's{' '}
        <code {...s.code}>Pressable</code> component. The same{' '}
        <code {...s.code}>:hover</code> and <code {...s.code}>:active</code>{' '}
        keys work in both environments when they are declared in a{' '}
        <Link to="/api/stylesheet">stylesheet</Link> and read with{' '}
        <Link to="/api/use-styles">useStyles</Link> -- the runtime behaviour
        adapts to each platform's capabilities.
      </p>
      <p>
        Inline <code {...s.code}>t</code> blocks are the exception. They have no
        native equivalent, since they rely on CSS custom properties, so on React
        Native they are dropped and the style degrades to its non-interactive
        base. Use a stylesheet with a registered host for anything interactive
        that has to run on native.
      </p>

      <h2 {...s.h2} id="advanced-how-it-works">
        Advanced: How It Works
      </h2>
      <p>
        On the web, interactive styles use the CSS "space toggle" technique. The
        system declares a custom property for each pseudo-state:
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
