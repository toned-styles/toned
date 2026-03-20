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
        to add conditional styling based on component state. Variant types are
        declared via a generic parameter, giving you full type safety from
        definition through to consumption.
      </p>

      <h2 {...s.h2}>Signature</h2>
      <CodeBlock>{`const styles = stylesheet({ ... }).variants<VariantMap>(($) => ({
  [$.variantName('value')]: {
    elementName: { /* token overrides */ },
  },
}))`}</CodeBlock>

      <h2 {...s.h2}>Defining Variants</h2>
      <p>
        Pass a type parameter describing the variant keys and their allowed
        values. Required variants must be provided by the consumer; optional
        variants (marked with <code {...s.code}>?</code>) are applied only when
        present:
      </p>
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: {
    borderRadius: 'medium',
    borderWidth: 'none',
    cursor: 'pointer',
  },
  label: {},
}).variants<{
  size: 'm' | 's'            // required
  variant: 'accent' | 'danger' // required
  alignment?: 'icon-only' | 'icon-left' | 'icon-right' // optional
}>(($) => ({
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
      <CodeBlock>{`($ => ({
  [$.size('m').alignment('icon-only')]: {
    container: { paddingX: 2, paddingY: 2 },
  },
  [$.size('s').alignment('icon-only')]: {
    container: { paddingX: 1, paddingY: 2 },
  },
}))`}</CodeBlock>
      <p>
        Compound variants are evaluated after individual variant rules, so they
        naturally override conflicting properties.
      </p>

      <h2 {...s.h2}>Pseudo-state Variants</h2>
      <p>
        You can target pseudo-states like hover by using the{' '}
        <code {...s.code}>'element:pseudo'</code> key syntax inside a variant
        block:
      </p>
      <CodeBlock>{`[$.variant('accent')]: {
  container: { bgColor: 'action' },
  label: { textColor: 'on_action' },

  'container:hover': {
    container: { bgColor: 'action_secondary' },
    label: { textColor: 'on_action_secondary' },
  },
}`}</CodeBlock>

      <h2 {...s.h2}>Responsive Variants</h2>
      <p>
        Breakpoints work inside variant blocks, so a variant can define
        responsive overrides for its elements:
      </p>
      <CodeBlock>{`[$.layout('grid')]: {
  container: {
    style: { display: 'grid', gridTemplateColumns: '1fr' },
    '@md': {
      style: { gridTemplateColumns: '1fr 1fr' },
    },
    '@lg': {
      style: { gridTemplateColumns: '1fr 1fr 1fr' },
    },
  },
}`}</CodeBlock>

      <h2 {...s.h2}>Named Styles ($composes)</h2>
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
      <CodeBlock>{`const buttonStyles = stylesheet({
  container: { borderRadius: 'medium' },
  label: {},
}).variants<{ size: 'm' | 's'; variant: 'accent' | 'danger' }>(($) => ({
  // Named style — shared across variants
  $('interactive'): {
    'container:hover': {
      container: { shadow: 'medium' },
    },
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
        Both <code {...s.code}>accent</code> and{' '}
        <code {...s.code}>danger</code> inherit the hover shadow from{' '}
        <code {...s.code}>interactive</code>, without repeating it.
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
      <CodeBlock>{`$('borders'): {
  container: { borderWidth: 'thin', borderColor: 'subtle' },
},
$('spacing'): {
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
