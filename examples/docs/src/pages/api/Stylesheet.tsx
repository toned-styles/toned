import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function ApiStylesheet() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>stylesheet</h1>
      <p>
        The <code {...s.code}>stylesheet</code> function creates a named
        collection of element styles using design tokens. It is returned by{' '}
        <code {...s.code}>defineSystem</code> and is bound to that system's
        token set.
      </p>

      <h2 {...s.h2}>Signature</h2>
      <CodeBlock>{`import { stylesheet } from '@toned/systems/base'

const styles = stylesheet({
  elementName: {
    // token properties
    bgColor: 'action',
    borderRadius: 'medium',
    // raw CSS escape hatch
    style: { cursor: 'pointer' },
  },
})`}</CodeBlock>

      <h2 {...s.h2}>Element Definition</h2>
      <p>
        Each key in the stylesheet object defines a named element. The value is
        an object with:
      </p>
      <p>
        <strong>Token properties</strong> -- Any token defined in your system (
        <code {...s.code}>bgColor</code>, <code {...s.code}>textColor</code>,{' '}
        <code {...s.code}>borderRadius</code>, <code {...s.code}>paddingX</code>
        , etc.). Values are type-checked against the token's allowed values.
      </p>
      <p>
        <strong>style</strong> -- An optional escape hatch for raw CSS
        properties not covered by tokens. Use this for properties like{' '}
        <code {...s.code}>cursor</code>, <code {...s.code}>position</code>, or{' '}
        <code {...s.code}>display</code>.
      </p>
      <p>
        <strong>$$type</strong> -- An optional hint (
        <code {...s.code}>'view'</code> or <code {...s.code}>'text'</code>) that
        can influence how tokens are resolved on different platforms.
      </p>

      <h2 {...s.h2}>Multiple Elements</h2>
      <p>
        Stylesheets commonly define multiple elements that together describe a
        component's visual structure:
      </p>
      <CodeBlock>{`export const cardStyles = stylesheet({
  card: {
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    style: { padding: '24px' },
  },
  title: {
    typo: 'heading_3',
    style: { marginBottom: '8px' },
  },
  body: {
    textColor: 'subtle',
    style: { lineHeight: 1.6 },
  },
})`}</CodeBlock>
      <p>
        When consumed by <code {...s.code}>useStyles</code>, you get back an
        object with <code {...s.code}>s.card</code>,{' '}
        <code {...s.code}>s.title</code>, and <code {...s.code}>s.body</code>{' '}
        that can be spread onto the corresponding JSX elements.
      </p>

      <h2 {...s.h2}>Chaining with Variants</h2>
      <p>
        Call <code {...s.code}>.variants()</code> on a stylesheet to add
        conditional styles. See the <a href="#api-variants">Variants</a> page
        for details.
      </p>
      <CodeBlock>{`const styles = stylesheet({
  container: { bgColor: 'action' },
}).variants<{ size: 'm' | 's' }>(($) => ({
  [$.size('m')]: { container: { paddingX: 3 } },
  [$.size('s')]: { container: { paddingX: 2 } },
}))`}</CodeBlock>

      <h2 {...s.h2}>Responsive Styles</h2>
      <p>
        Use breakpoint keys prefixed with <code {...s.code}>@</code> to apply
        different token values at different screen sizes:
      </p>
      <CodeBlock>{`const styles = stylesheet({
  container: {
    paddingX: 2,
    '@md': { paddingX: 4 },
    '@lg': { paddingX: 6 },
  },
})`}</CodeBlock>
    </article>
  )
}
