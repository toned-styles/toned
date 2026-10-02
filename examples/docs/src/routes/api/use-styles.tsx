import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/use-styles')({
  component: ApiUseStyles,
})

function ApiUseStyles() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>useStyles</h1>
      <p>
        <code {...s.code}>useStyles</code> is the React hook that connects a
        toned stylesheet to your component. It resolves tokens into
        platform-appropriate props (<code {...s.code}>style</code>,{' '}
        <code {...s.code}>className</code>, etc.) and applies variant matching
        based on the state you provide.
      </p>

      <h2 {...s.h2} id="signature">
        Signature
      </h2>
      <CodeBlock>{`import { useStyles } from '@toned/react'
import { buttonStyles, cardStyles } from './styles.ts'

// Without variants
const card = useStyles(cardStyles)

// With variants
const button = useStyles(buttonStyles, { variant: 'accent', size: 'm' })`}</CodeBlock>
      <p>
        The examples on this page read their sheets from one module,{' '}
        <a href="#styles-used-on-this-page">shown at the end</a>.
      </p>

      <h3 {...s.h3} id="parameters">
        Parameters
      </h3>
      <p>
        <strong>stylesheet</strong> -- A stylesheet created with{' '}
        <code {...s.code}>stylesheet()</code>, optionally with{' '}
        <code {...s.code}>.variants()</code> chained. This is the style
        definition to resolve.
      </p>
      <p>
        <strong>state</strong> -- An object of variant key-value pairs. Required
        when the stylesheet has required variants; omit when there are no
        variants. TypeScript enforces correctness here.
      </p>

      <h3 {...s.h3} id="return-value">
        Return Value
      </h3>
      <p>
        An object with one key per element defined in the stylesheet. Each value
        is a props object that can be spread onto a JSX element:
      </p>
      <CodeBlock>{`const s = useStyles(buttonStyles, { size: 'm', variant: 'accent' })

// s.Root  => { style: {...}, className: '...' }
// s.Label => { style: {...}, className: '...' }

return (
  <button {...s.Root}>
    <span {...s.Label}>Click me</span>
  </button>
)`}</CodeBlock>

      <h2 {...s.h2} id="how-it-works">
        How It Works
      </h2>
      <p>
        Each render creates a private candidate using the current configuration,
        tokens, overrides and variants. The candidate becomes committed in a
        layout effect after host mutations. Suspended renders cannot publish
        pending inputs. Committed interaction and measurement updates can patch
        hosts directly without rendering React; immutable matching plans are
        reused.
      </p>

      <h2 {...s.h2} id="stable-element-families">
        Stable element families
      </h2>
      <CodeBlock title="Button.tsx">{`import { createElements } from '@toned/react'
import { buttonStyles } from './styles.ts'

const S = createElements(buttonStyles)

function Button() {
  return <S size="m" variant="accent">
    <S.Root as="button"><S.Label as="span">Save</S.Label></S.Root>
  </S>
}`}</CodeBlock>
      <p>
        The provider is hostless and carries the current render snapshot to its
        parts. Independent standalone parts use base/default styles;
        relationships and grid parts require shared scope. Existing
        useBind/$scope APIs remain compatible. Use prop bags when spreading onto
        a host is the better fit.
      </p>

      <h2 {...s.h2} id="usage-patterns">
        Usage Patterns
      </h2>

      <h3 {...s.h3} id="static-styles-no-variants">
        Static Styles (No Variants)
      </h3>
      <p>
        For stylesheets without variants, call useStyles with just the
        stylesheet:
      </p>
      <CodeBlock title="Card.tsx">{`import { useStyles } from '@toned/react'
import { cardStyles } from './styles.ts'

function Card({ children }: { children: React.ReactNode }) {
  const s = useStyles(cardStyles)
  return <div {...s.Root}>{children}</div>
}`}</CodeBlock>

      <h3 {...s.h3} id="dynamic-variants">
        Dynamic Variants
      </h3>
      <p>
        For stylesheets with variants, pass the variant state as the second
        argument. The styles follow the state whenever it changes:
      </p>
      <CodeBlock>{`function NavLink({ href, label, isActive }: {
  href: string; label: string; isActive: boolean
}) {
  const s = useStyles(navStyles, {
    active: isActive,
  })
  return <a href={href} {...s.Link}>{label}</a>
}`}</CodeBlock>

      <h3 {...s.h3} id="forwarding-props">
        Forwarding Props
      </h3>
      <p>
        Since <code {...s.code}>useStyles</code> returns plain props objects,
        you can combine them with additional props:
      </p>
      <CodeBlock>{`function Input({ error, ...rest }:
  React.ComponentProps<'input'> & { error: boolean }
) {
  const s = useStyles(inputStyles, { error })
  return <input {...s.Input.withProps<'input'>(rest)} />
}`}</CodeBlock>

      <h3 {...s.h3} id="two-parts-on-one-element">
        Two Parts on One Element
      </h3>
      <p>
        <code {...s.code}>.with()</code> merges another part of the same sheet
        onto the element, and skips a falsy argument. Each part keeps its own
        styles there, so removing one leaves the other intact. For a state with
        a fixed set of values, a variant is the simpler declaration.
      </p>
      <CodeBlock>{`function Field({ invalid }: { invalid: boolean }) {
  const s = useStyles(fieldStyles)
  return <input {...s.Input.with(invalid && s.Invalid)} />
}`}</CodeBlock>
      <p>
        Spread a prop bag whole and last. It carries the{' '}
        <code {...s.code}>ref</code> that attaches the part, so a{' '}
        <code {...s.code}>ref</code>, <code {...s.code}>style</code> or{' '}
        <code {...s.code}>className</code> written before the spread is replaced
        by it; pass those through <code {...s.code}>withProps</code>, which
        merges them.
      </p>

      <h2 {...s.h2} id="styles-used-on-this-page">
        Styles used on this page
      </h2>
      <p>
        The components above import these sheets. They use the base system's
        tokens; see <Link to="/api/stylesheet">stylesheet</Link> and{' '}
        <Link to="/api/variants">variants</Link> for the declarations
        themselves.
      </p>
      <CodeBlock title="styles.ts">{`import type { Variants } from '@toned/core'
import { stylesheet } from '@toned/systems/base'

export const cardStyles = stylesheet({
  Root: { bgColor: 'elevated', borderRadius: 'large', padding: 2 },
})

export const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', bgColor: 'action', borderRadius: 'medium' },
  Label: { $kind: 'text', textColor: 'on_action' },
}).variants(($: Variants<{
  size: 'm' | 's'
  variant: 'accent' | 'danger'
}>) => ({
  [$.variant('danger')]: {
    Root: { bgColor: 'destructive' },
    Label: { textColor: 'on_destructive' },
  },
  [$.size('m')]: { Root: { paddingX: 3 } },
  [$.size('s')]: { Root: { paddingX: 2, paddingY: 1 } },
}))

export const navStyles = stylesheet({
  Link: { $kind: 'text', textColor: 'muted' },
}).variants(($: Variants<{ active: boolean }>) => ({
  [$.active(true)]: { Link: { textColor: 'action' } },
}))

export const fieldStyles = stylesheet({
  Input: { borderWidth: 'thin', borderColor: 'default', borderRadius: 'medium' },
  Invalid: { borderColor: 'status_error' },
})

export const inputStyles = stylesheet({
  Input: { borderWidth: 'thin', borderColor: 'default', borderRadius: 'medium' },
}).variants(($: Variants<{ error: boolean }>) => ({
  [$.error(true)]: { Input: { borderColor: 'status_error' } },
}))`}</CodeBlock>
    </article>
  )
}
