import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/variants')({
  component: ApiVariants,
})

function ApiVariants() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>variants</h1>
      <p>
        The <code {...s.code}>.variants()</code> method chains onto a stylesheet
        to add conditional styling based on component state. Annotate the
        selector parameter with <code {...s.code}>Variants&lt;Mods&gt;</code>.
        Toned infers the returned rules and checks their parts, token values,
        and nested declarations.
      </p>
      <p>
        A design-system module can re-export the{' '}
        <code {...s.code}>Variants</code> type. With a namespace import such as{' '}
        <code {...s.code}>import * as ui from './ui'</code>, write{' '}
        <code {...s.code}>$: ui.Variants&lt;Mods&gt;</code>. The optional second
        callback parameter, <code {...s.code}>q</code>, infers the declared
        parts and system conditions. No currying or validation wrapper is
        needed. Older signatures remain available for compatibility.
      </p>

      <h2 {...s.h2}>Signature</h2>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const styles = stylesheet({ ... }).variants(($: Variants<VariantMap>) => ({
  [$.variantName('value')]: {
    elementName: { /* token overrides */ },
  },
}))`}</CodeBlock>

      <h2 {...s.h2}>Defining Variants</h2>
      <p>
        Reuse ordinary TypeScript types for variant keys and their allowed
        values. A required axis without a default must be provided by the
        consumer; an optional axis (marked with <code {...s.code}>?</code>) can
        be omitted. A rule matches when its selector values are selected:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

type Size = 'm' | 's'
type ButtonVariants = {
  size: Size                 // reusable axis type
  variant: 'accent' | 'danger' // required
  alignment?: 'icon-only' | 'icon-left' | 'icon-right' // optional
}

const buttonStyles = stylesheet({
  container: {
    borderRadius: 'medium',
    borderWidth: 'none',
    cursor: 'pointer',
  },
  label: {},
}).variants(($: Variants<ButtonVariants>) => ({
  [$.variant('accent')]: {
    container: { bgColor: 'action' },
    label: { textColor: 'on_action' },
  },
  [$.variant('danger')]: {
    container: { bgColor: 'status_error' },
    label: { textColor: 'on_status_error' },
  },
  [$.size('m')]: {
    container: { paddingX: 3 },
  },
  [$.size('s')]: {
    container: { paddingX: 2, paddingY: 1 },
  },
}))`}</CodeBlock>

      <h2 {...s.h2}>The Dollar-Sign Builder</h2>
      <p>
        The callback receives a <code {...s.code}>$</code> builder object with a
        method for each variant key. Calling{' '}
        <code {...s.code}>$.size('m')</code> produces a computed key that the
        runtime uses to match against the state passed to{' '}
        <code {...s.code}>useStyles</code>.
      </p>

      <h2 {...s.h2}>Compound Variants</h2>
      <p>
        Chain multiple variant calls to create compound conditions that only
        match when all specified variants are active simultaneously:
      </p>
      <CodeBlock>{`// Inside the .variants callback:
{
  [$.size('m').alignment('icon-only')]: {
    container: { paddingX: 2, paddingY: 2 },
  },
  [$.size('s').alignment('icon-only')]: {
    container: { paddingX: 1, paddingY: 2 },
  },
}`}</CodeBlock>
      <p>
        Matching variant rules apply in declaration order: later rules win
        conflicting properties. Chaining selectors adds conditions, not an
        automatic specificity bonus. Put a compound rule after the individual
        rules it should override.
      </p>

      <h2 {...s.h2}>Pseudo-state Variants</h2>
      <p>
        Colocate a state rule under the part it styles. Use{' '}
        <code {...s.code}>':hover'</code> or the inferred{' '}
        <code {...s.code}>[q.state('hover')]</code> key inside that part:
      </p>
      <CodeBlock>{`[$.variant('accent')]: {
  container: {
    bgColor: 'action',
    ':hover': { bgColor: 'action_secondary' },
  },
  label: { textColor: 'on_action' },
}`}</CodeBlock>

      <h2 {...s.h2}>Responsive Variants</h2>
      <p>
        Breakpoints work inside variant blocks, so a variant can define
        responsive overrides for its elements:
      </p>
      <CodeBlock>{`[$.layout('grid')]: {
  container: {
    '@platform web': {
      $style: { display: 'grid', gridTemplateColumns: '1fr' },
      '@md': {
        $style: { gridTemplateColumns: '1fr 1fr' },
      },
      '@lg': {
        $style: { gridTemplateColumns: '1fr 1fr 1fr' },
      },
    },
  },
}`}</CodeBlock>

      <h2 {...s.h2}>Named Styles ($compose)</h2>
      <p>
        When multiple variants share common element overrides, you can extract
        them into a <strong>named style</strong> and compose them into variants.
        This avoids duplicating the same token values across variant rules.
      </p>

      <h3 {...s.h3}>Defining Named Styles</h3>
      <p>
        Use <code {...s.code}>$('name')</code> to define a named style block.
        Named styles are not variant rules — they are reusable fragments that
        can be composed into actual variants:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const buttonStyles = stylesheet({
  container: { borderRadius: 'medium' },
  label: {},
}).variants(($: Variants<{ size: 'm' | 's'; variant: 'accent' | 'danger' }>) => ({
  // Named style — shared across variants
  [$('interactive')]: {
    container: { ':hover': { shadow: 'medium' } },
  },

  [$.variant('accent')]: {
    $compose: 'interactive',
    container: { bgColor: 'action' },
    label: { textColor: 'on_action' },
  },

  [$.variant('danger')]: {
    $compose: 'interactive',
    container: { bgColor: 'status_error' },
    label: { textColor: 'on_status_error' },
  },
}))`}</CodeBlock>
      <p>
        Both <code {...s.code}>accent</code> and <code {...s.code}>danger</code>{' '}
        inherit the hover shadow from <code {...s.code}>interactive</code>,
        without repeating it.
      </p>

      <h3 {...s.h3}>Element-Level $compose</h3>
      <p>
        Inside a single variant rule, you can compose one element from another
        element defined in the same block. This is useful when several elements
        within a variant share a base set of tokens:
      </p>
      <CodeBlock>{`[$.size('s')]: {
  base: { paddingX: 2, bgColor: 'muted' },
  container: {
    $compose: 'base',
    borderRadius: 'medium',
  },
  sidebar: {
    $compose: 'base',
    borderRadius: 'small',
  },
}`}</CodeBlock>
      <p>
        Here both <code {...s.code}>container</code> and{' '}
        <code {...s.code}>sidebar</code> inherit{' '}
        <code {...s.code}>paddingX</code> and <code {...s.code}>bgColor</code>{' '}
        from <code {...s.code}>base</code>, then add their own overrides. The
        composed element (<code {...s.code}>base</code>) is not included in the
        final output — it only serves as a source for composition.
      </p>

      <h3 {...s.h3}>Composing Multiple Sources</h3>
      <p>
        Pass an array to <code {...s.code}>$compose</code> to merge from
        multiple named styles. They are applied in order, and the variant's own
        properties always take priority:
      </p>
      <CodeBlock>{`[$('borders')]: {
  container: { borderWidth: 'thin', borderColor: 'subtle' },
},
[$('spacing')]: {
  container: { paddingX: 3, paddingY: 2 },
},

[$.size('m')]: {
  $compose: ['borders', 'spacing'],
  container: { bgColor: 'elevated' },  // own props override composed ones
}`}</CodeBlock>

      <h2 {...s.h2}>Consuming Variants</h2>
      <p>
        Pass variant values as the second argument to{' '}
        <code {...s.code}>useStyles</code>:
      </p>
      <CodeBlock>{`function Button({ label, size, variant }: Props) {
  const s = useStyles(buttonStyles, { size, variant })
  return (
    <button {...s.container}>
      <span {...s.label}>{label}</span>
    </button>
  )
}`}</CodeBlock>
    </article>
  )
}
