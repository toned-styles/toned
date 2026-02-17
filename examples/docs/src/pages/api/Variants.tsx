import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function ApiVariants() {
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
    style: { cursor: 'pointer' },
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
