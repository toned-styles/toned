import { createFileRoute } from '@tanstack/react-router'
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

// Without variants
const cardStyles = stylesheet({ Root: { padding: 2 } })
const base = useStyles(cardStyles)

// With variants
const selected = useStyles(buttonStyles, { variant: 'accent', size: 'm' })`}</CodeBlock>

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
      <CodeBlock>{`import { createElements } from '@toned/react'
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
      <CodeBlock>{`const cardStyles = stylesheet({
  Root: { bgColor: 'elevated', borderRadius: 'large' },
})

function Card({ children }: { children: React.ReactNode }) {
  const s = useStyles(cardStyles)
  return <div {...s.Root}>{children}</div>
}`}</CodeBlock>

      <h3 {...s.h3} id="dynamic-variants">
        Dynamic Variants
      </h3>
      <p>
        For stylesheets with variants, pass the variant state as the second
        argument. The hook will update whenever the state changes:
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
    </article>
  )
}
