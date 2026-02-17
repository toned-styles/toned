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
      <h1 {...s.h1}>Interactive Styles Guide</h1>
      <p>
        Interactive styles let you respond to user interactions like hover,
        focus, and active states. toned-styles supports these through
        pseudo-state keys inside variant blocks.
      </p>

      <h2 {...s.h2}>Pseudo-State Syntax</h2>
      <p>
        Inside a variant block, use the{' '}
        <code {...s.code}>'element:pseudo'</code> key pattern to define styles
        that apply only during a specific interaction state:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: {
    bgColor: 'action',
    borderRadius: 'medium',
    cursor: 'pointer',
  },
  label: {
    textColor: 'on_action',
  },
}).variants<{
  variant: 'accent' | 'danger'
}>(($) => ({
  [$.variant('accent')]: {
    container: { bgColor: 'action' },
    label: { textColor: 'on_action' },

    // Hover state: the key format is 'element:pseudo'
    'container:hover': {
      container: { bgColor: 'action_secondary' },
      label: { textColor: 'on_action_secondary' },
    },
  },
}))`}</CodeBlock>

      <h2 {...s.h2}>Supported Pseudo-States</h2>
      <p>The following pseudo-states are supported on web:</p>
      <p>
        <code {...s.code}>:hover</code> -- Applied when the user's pointer is
        over the element.
      </p>
      <p>
        <code {...s.code}>:focus</code> -- Applied when the element receives
        keyboard focus.
      </p>
      <p>
        <code {...s.code}>:active</code> -- Applied while the element is being
        activated (e.g. mouse button is held down).
      </p>

      <h2 {...s.h2}>How It Works on Web</h2>
      <p>
        When <code {...s.code}>useClassName: true</code> is set in your config,
        interactive pseudo-states are compiled into CSS pseudo-class selectors.
        This means hover and focus effects are handled entirely by the browser's
        CSS engine, with no JavaScript event listeners required:
      </p>
      <CodeBlock>{`/* Generated CSS (simplified) */
.toned-abc123:hover {
  background-color: var(--color-action-secondary);
}
.toned-abc123:hover .toned-def456 {
  color: var(--color-on-action-secondary);
}`}</CodeBlock>

      <h2 {...s.h2}>Cross-Element Interactions</h2>
      <p>
        Notice that the pseudo-state key references a specific element (
        <code {...s.code}>'container:hover'</code>), but the style block inside
        can target any element in the stylesheet. This lets you change the
        label's colour when the container is hovered:
      </p>
      <CodeBlock>{`'container:hover': {
  // These styles apply when 'container' is hovered
  container: { bgColor: 'action_secondary' },
  label: { textColor: 'on_action_secondary' },
}`}</CodeBlock>

      <h2 {...s.h2}>Combining with Variants</h2>
      <p>
        Interactive styles live inside variant blocks, so different variants can
        have different hover/focus behaviours:
      </p>
      <CodeBlock>{`[$.variant('accent')]: {
  container: { bgColor: 'action' },
  'container:hover': {
    container: { bgColor: 'action_secondary' },
  },
},
[$.variant('danger')]: {
  container: { bgColor: 'status_error' },
  'container:hover': {
    container: { bgColor: 'status_error', shadow: 'medium' },
  },
}`}</CodeBlock>

      <h2 {...s.h2}>React Native Considerations</h2>
      <p>
        React Native does not have native CSS pseudo-classes. On React Native,
        hover states are typically not applicable (no mouse cursor on touch
        devices). Focus and active states can be handled through React Native's{' '}
        <code {...s.code}>Pressable</code> component and its style callback
        pattern. toned-styles provides a consistent authoring model, but the
        runtime behaviour adapts to each platform's capabilities.
      </p>
    </article>
  )
}
