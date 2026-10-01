import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/stylesheet')({
  component: ApiStylesheet,
})

function ApiStylesheet() {
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

      <h2 {...s.h2} id="signature">
        Signature
      </h2>
      <CodeBlock>{`import { stylesheet } from '@toned/systems/base'

const styles = stylesheet({
  PartName: {
    $kind: 'pressable',
    // token properties
    bgColor: 'action',
    borderRadius: 'medium',
    cursor: 'pointer',
    // escape hatch: a web-only property that no token covers
    '@platform web': { $style: { userSelect: 'none' } },
  },
})`}</CodeBlock>

      <h2 {...s.h2} id="element-definition">
        Element Definition
      </h2>
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
        <strong>$style</strong> -- The escape hatch: portable raw fields that no
        token covers. Reach for a token first. An explicit platform block widens
        the allowed fields for that platform.
      </p>
      <p>
        <strong>$kind</strong> -- What the part is:{' '}
        <code {...s.code}>'view'</code> (the default),{' '}
        <code {...s.code}>'text'</code>, <code {...s.code}>'image'</code> or{' '}
        <code {...s.code}>'pressable'</code>. It selects the element or native
        primitive the part renders as, and limits the part to the tokens that
        apply to that kind. It is fixed: a state, condition or variant cannot
        change it.
      </p>
      <p>
        <strong>States and conditions</strong> -- Keys such as{' '}
        <code {...s.code}>':hover'</code>, <code {...s.code}>'@media md'</code>{' '}
        and <code {...s.code}>'@platform web'</code> hold the values that apply
        in that state or condition.{' '}
        <Link to="/api/conditions">Conditions and selectors</Link> lists every
        key, including the earlier <code {...s.code}>'@md'</code>,{' '}
        <code {...s.code}>style</code> and <code {...s.code}>$$type</code>{' '}
        spellings, which remain supported.
      </p>

      <h2 {...s.h2} id="multiple-elements">
        Multiple Elements
      </h2>
      <p>
        Stylesheets commonly define multiple elements that together describe a
        component's visual structure:
      </p>
      <CodeBlock>{`export const cardStyles = stylesheet({
  Root: {
    flexLayout: 'column',
    gap: 1,
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    padding: 3,
  },
  Title: {
    $kind: 'text',
    typography: 'heading-3',
  },
  Body: {
    $kind: 'text',
    typography: 'body-medium',
    textColor: 'subtle',
  },
})`}</CodeBlock>
      <p>
        Bound with <code {...s.code}>createElements</code>, the sheet becomes{' '}
        <code {...s.code}>S.Root</code>, <code {...s.code}>S.Title</code> and{' '}
        <code {...s.code}>S.Body</code> components.{' '}
        <code {...s.code}>useStyles</code> returns the same parts as prop bags
        to spread onto your own JSX elements.
      </p>

      <h2 {...s.h2} id="chaining-with-variants">
        Chaining with Variants
      </h2>
      <p>
        Call <code {...s.code}>.variants()</code> on a stylesheet to add
        conditional styles. See the <Link to="/api/variants">Variants</Link>{' '}
        page for details.
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const styles = stylesheet({
  Root: { bgColor: 'action' },
}).variants(($: Variants<{ size: 'm' | 's' }>) => ({
  [$.size('m')]: { Root: { paddingX: 3 } },
  [$.size('s')]: { Root: { paddingX: 2 } },
}))`}</CodeBlock>

      <h2 {...s.h2} id="deriving-a-sheet">
        Deriving a Sheet
      </h2>
      <p>
        <code {...s.code}>.extend()</code> returns a new sheet with rules merged
        into this one's base declarations; the original is unchanged and its
        variants still apply on top. See{' '}
        <Link to="/guides/overrides">Extending and overriding</Link> for this
        and for overrides that win over variants.
      </p>
      <CodeBlock>{`const baseCard = stylesheet({
  Root: { bgColor: 'elevated', borderRadius: 'large', padding: 3 },
})

export const flatCard = baseCard.extend({
  Root: { bgColor: 'default', borderRadius: 'small' },
})`}</CodeBlock>

      <h2 {...s.h2} id="responsive-styles">
        Responsive Styles
      </h2>
      <p>
        Use <code {...s.code}>@media</code> keys that name a breakpoint to apply
        different token values at different screen sizes:
      </p>
      <CodeBlock>{`const styles = stylesheet({
  Root: {
    paddingX: 2,
    '@media md': { paddingX: 4 },
    '@media lg': { paddingX: 6 },
  },
})`}</CodeBlock>
      <p>
        The same blocks are accepted by the inline <code {...s.code}>t</code>{' '}
        utility -- see <Link to="/api/define-system">defineSystem</Link> --
        though the root-level and cross-element forms remain stylesheet-only.
      </p>
    </article>
  )
}
