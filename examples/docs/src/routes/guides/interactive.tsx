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
        toned-styles handles hover, focus, and active states using the same CSS
        variable trick that powers responsive breakpoints. No JavaScript event
        listeners are needed for element-level pseudo-classes on the web.
      </p>

      <h2 {...s.h2}>CSS Variable Mechanism</h2>
      <p>
        The styling system declares three CSS custom properties on the root
        element, one for each pseudo-state:
      </p>
      <CodeBlock>{`html {
  --toned_hover: initial;
  --toned_focus: initial;
  --toned_active: initial;
}`}</CodeBlock>
      <p>
        Each variable is toggled by a set of cascade rules that use the{' '}
        <code {...s.code}>_</code> class (applied to every styled element
        automatically):
      </p>
      <CodeBlock>{`/* Activate: when element is hovered, set variable to empty (truthy) */
._:hover { --toned_hover: ; }

/* Reset children: prevent unintended inheritance */
._:hover ._ { --toned_hover: initial; }

/* Re-activate nested: allow nested hover states to work independently */
._:hover ._:hover { --toned_hover: ; }`}</CodeBlock>
      <p>
        This is the same pattern used for breakpoints. Compare with{' '}
        <code {...s.code}>@media</code> rules that toggle{' '}
        <code {...s.code}>--media-md</code> from{' '}
        <code {...s.code}>initial</code> to an empty value at a given viewport
        width. For pseudo-states, the toggle happens via CSS pseudo-class
        selectors instead of <code {...s.code}>@media</code> queries, but the
        underlying variable mechanism is identical.
      </p>

      <h2 {...s.h2}>Element-Level Pseudo-Classes</h2>
      <p>
        Use a colon-prefixed key inside an element definition to declare styles
        that apply during a specific interaction state:
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
      <p>
        When the <code {...s.code}>container</code> element is hovered, the{' '}
        <code {...s.code}>--toned_hover</code> variable toggles on that element,
        and the background colour switches to{' '}
        <code {...s.code}>action_secondary</code>. This works entirely through
        CSS, with no JavaScript event listeners attached.
      </p>

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
        The key <code {...s.code}>'container:hover'</code> means "when the
        container element is hovered". The object inside targets any element in
        the stylesheet. This lets you build interactive components where hovering
        a parent changes the appearance of its children.
      </p>

      <h2 {...s.h2}>Supported Pseudo-States</h2>
      <p>Three pseudo-states are supported:</p>
      <p>
        <code {...s.code}>:hover</code> — pointer is over the element.
      </p>
      <p>
        <code {...s.code}>:focus</code> — element has keyboard focus.
      </p>
      <p>
        <code {...s.code}>:active</code> — element is being activated (e.g.
        mouse button held down).
      </p>
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
        Pseudo-classes and breakpoints can be used together. Since both use the
        same CSS variable mechanism, they compose naturally:
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

      <h2 {...s.h2}>How It Works Under the Hood</h2>
      <p>
        The CSS variable toggle trick works by exploiting how{' '}
        <code {...s.code}>var()</code> handles the{' '}
        <code {...s.code}>initial</code> keyword versus an empty value:
      </p>
      <CodeBlock>{`/* When --toned_hover is 'initial', var() falls through to the fallback */
background: var(--toned_hover, blue);
/* → 'initial blue' is invalid, so the fallback (blue) is NOT used */
/* Actually: initial means the variable is "not set", so fallback IS used */

/* When --toned_hover is '' (empty), var() uses the empty value */
background: var(--toned_hover, blue);
/* → '' (empty) is valid, concatenated: ' blue' is the used value */`}</CodeBlock>
      <p>
        When <code {...s.code}>--toned_hover</code> is{' '}
        <code {...s.code}>initial</code>, the CSS variable is considered unset,
        and the fallback value in <code {...s.code}>var()</code> takes effect.
        When it is set to an empty value (a space-toggle), the variable is
        considered set and the primary value is used.
      </p>
      <p>
        The three-rule cascade ensures proper scoping:
      </p>
      <p>
        <strong>Rule 1:</strong>{' '}
        <code {...s.code}>{'._:hover { --toned_hover: ; }'}</code> activates the
        variable on the hovered element itself.
      </p>
      <p>
        <strong>Rule 2:</strong>{' '}
        <code {...s.code}>{'._:hover ._ { --toned_hover: initial; }'}</code>{' '}
        resets children so that a parent's hover does not leak into unrelated
        descendants.
      </p>
      <p>
        <strong>Rule 3:</strong>{' '}
        <code {...s.code}>
          {'._:hover ._:hover { --toned_hover: ; }'}
        </code>{' '}
        re-activates the variable on nested elements that are themselves hovered.
      </p>

      <h2 {...s.h2}>React Native</h2>
      <p>
        React Native does not have CSS pseudo-classes. On native platforms,
        interactive states are handled through React Native's{' '}
        <code {...s.code}>Pressable</code> component and its style callback
        pattern. toned-styles provides a consistent authoring model across
        platforms — the same <code {...s.code}>:hover</code> and{' '}
        <code {...s.code}>:active</code> keys work in both environments, but the
        runtime behaviour adapts to each platform's capabilities.
      </p>
    </article>
  )
}
