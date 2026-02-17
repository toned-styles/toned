import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function ApiUseStyles() {
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

      <h2 {...s.h2}>Signature</h2>
      <CodeBlock>{`import { useStyles } from '@toned/react'

// Without variants
const s = useStyles(stylesheet)

// With variants
const s = useStyles(stylesheet, { variant: 'accent', size: 'm' })`}</CodeBlock>

      <h3 {...s.h3}>Parameters</h3>
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

      <h3 {...s.h3}>Return Value</h3>
      <p>
        An object with one key per element defined in the stylesheet. Each value
        is a props object that can be spread onto a JSX element:
      </p>
      <CodeBlock>{`const s = useStyles(buttonStyles, { size: 'm', variant: 'accent' })

// s.container => { style: {...}, className: '...' }
// s.label     => { style: {...}, className: '...' }

return (
  <button {...s.container}>
    <span {...s.label}>Click me</span>
  </button>
)`}</CodeBlock>

      <h2 {...s.h2}>How It Works</h2>
      <p>
        Under the hood, <code {...s.code}>useStyles</code> reads the active
        config (set by <code {...s.code}>setConfig</code> in your config file)
        and calls the stylesheet's initialisation function. It caches the result
        in a ref and only re-initialises when the stylesheet reference changes.
        When the state object changes, it calls an internal{' '}
        <code {...s.code}>applyState</code> method to update variant matching
        without re-creating the full style map.
      </p>

      <h2 {...s.h2}>Usage Patterns</h2>

      <h3 {...s.h3}>Static Styles (No Variants)</h3>
      <p>
        For stylesheets without variants, call useStyles with just the
        stylesheet:
      </p>
      <CodeBlock>{`const cardStyles = stylesheet({
  card: { bgColor: 'elevated', borderRadius: 'large' },
})

function Card({ children }) {
  const s = useStyles(cardStyles)
  return <div {...s.card}>{children}</div>
}`}</CodeBlock>

      <h3 {...s.h3}>Dynamic Variants</h3>
      <p>
        For stylesheets with variants, pass the variant state as the second
        argument. The hook will update whenever the state changes:
      </p>
      <CodeBlock>{`function NavLink({ href, label, isActive }) {
  const s = useStyles(navStyles, {
    active: isActive ? 'true' : undefined,
  })
  return <a href={href} {...s.link}>{label}</a>
}`}</CodeBlock>

      <h3 {...s.h3}>Forwarding Props</h3>
      <p>
        Since <code {...s.code}>useStyles</code> returns plain props objects,
        you can combine them with additional props:
      </p>
      <CodeBlock>{`function Input({ error, ...rest }) {
  const s = useStyles(inputStyles, { error: error ? 'true' : undefined })
  return <input {...s.input} {...rest} />
}`}</CodeBlock>
    </article>
  )
}
