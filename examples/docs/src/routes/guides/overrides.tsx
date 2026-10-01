import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/overrides')({
  component: GuideOverrides,
})

function GuideOverrides() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Extending and overriding</h1>
      <p>
        Three ways to change a stylesheet without editing it. They differ in
        whether the change wins over the sheet's variants, and in whether it
        makes a new sheet or reaches an existing component.
      </p>
      <div
        {...s.tableScroll}
        role="region"
        aria-label="Ways to change a stylesheet"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll a wide table.
        tabIndex={0}
      >
        <table {...s.table}>
          <thead>
            <tr>
              <th scope="col">API</th>
              <th scope="col">Produces</th>
              <th scope="col">Against the sheet's variants</th>
              <th scope="col">Applies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code {...s.code}>sheet.extend(rules)</code>
              </td>
              <td>a new sheet</td>
              <td>the variants still win</td>
              <td>where the new sheet is used</td>
            </tr>
            <tr>
              <td>
                <code {...s.code}>overrideSheet(sheet, rules)</code>
              </td>
              <td>a new sheet</td>
              <td>the override wins</td>
              <td>where the new sheet is used</td>
            </tr>
            <tr>
              <td>
                <code {...s.code}>StyleOverrides</code>
              </td>
              <td>nothing new</td>
              <td>the override wins</td>
              <td>to that sheet, inside one subtree</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The examples change the button from{' '}
        <Link to="/getting-started">Getting Started</Link>: its{' '}
        <code {...s.code}>buttonStyles</code> sheet has an accent background and
        a <code {...s.code}>size</code> variant that sets the padding.
      </p>

      <h2 {...s.h2} id="extend">
        New defaults with extend
      </h2>
      <p>
        <code {...s.code}>extend</code> merges rules into the sheet's base
        declarations and returns a new sheet with the same parts, variants and
        defaults. The variants still apply on top, so a value they set is not
        changed. It can also add parts.
      </p>
      <CodeBlock title="link-button.styles.ts">{`import { buttonStyles } from './styles.ts'

export const linkButtonStyles = buttonStyles.extend({
  // Every size keeps its padding; only the background changes.
  Root: { background: 'neutral' },
  // A part the original does not have.
  Icon: { $kind: 'text', text: 'caption' },
})`}</CodeBlock>

      <h2 {...s.h2} id="override-sheet">
        A layer above the variants with overrideSheet
      </h2>
      <p>
        <code {...s.code}>overrideSheet</code> returns a new sheet whose rules
        apply after the original's variants. A third argument adds variant rules
        of its own, over the same axes. <code {...s.code}>null</code> removes
        the declaration at that exact place.
      </p>
      <CodeBlock title="compact-button.styles.ts">{`import { overrideSheet } from '@toned/core'
import { buttonStyles } from './styles.ts'

export const compactButtonStyles = overrideSheet(
  buttonStyles,
  {
    // Wins over the padding that the size variants set.
    Root: { padding: 1 },
    // Removes the base declaration. A variant that sets text still applies.
    Label: { text: null },
  },
  $ => ({
    [$.size('m')]: { Label: { text: 'caption' } },
  }),
)`}</CodeBlock>
      <p>
        A sheet made either way is an ordinary sheet. Bind it like the original:
      </p>
      <CodeBlock title="CompactButton.tsx">{`import { createElements } from '@toned/react'
import { compactButtonStyles } from './compact-button.styles.ts'

const S = createElements(compactButtonStyles)

export function CompactButton({ label }: { label: string }) {
  return (
    <S>
      <S.Root as="button" type="button">
        <S.Label as="span">{label}</S.Label>
      </S.Root>
    </S>
  )
}`}</CodeBlock>

      <h2 {...s.h2} id="style-overrides">
        An existing component, inside one subtree
      </h2>
      <p>
        <code {...s.code}>StyleOverrides</code> changes a sheet for the
        components rendered inside it, without touching those components.{' '}
        <code {...s.code}>overrideStyles</code> pairs the sheet with the rules;
        its <code {...s.code}>.variants()</code> adds variant rules. Declare the
        list at module scope so it is the same array on every render.
      </p>
      <CodeBlock title="Toolbar.tsx">{`import { overrideStyles, StyleOverrides } from '@toned/react'
import { Button } from './Button.tsx'
import { buttonStyles } from './styles.ts'

const toolbarOverrides = [
  overrideStyles(buttonStyles, {
    Root: { background: 'neutral' },
  }).variants($ => ({
    [$.size('s')]: { Root: { padding: 2 } },
  })),
]

export function Toolbar() {
  return (
    <StyleOverrides value={toolbarOverrides}>
      <Button label="Undo" size="s" />
      <Button label="Redo" size="s" />
    </StyleOverrides>
  )
}`}</CodeBlock>
      <p>
        An entry matches the exact sheet object it names. An override of{' '}
        <code {...s.code}>buttonStyles</code> does not reach a component that
        renders <code {...s.code}>compactButtonStyles</code>; name that sheet in
        its own entry. Nested <code {...s.code}>StyleOverrides</code> add to the
        outer ones, and the inner entry wins where both set a value.
      </p>

      <h2 {...s.h2} id="build">
        Include derived sheets in the build
      </h2>
      <p>
        A sheet from <code {...s.code}>extend</code> or{' '}
        <code {...s.code}>overrideSheet</code> that adds a condition, a state or
        web rules needs CSS of its own. List it in the build's sheets with the
        others; the same holds for an <code {...s.code}>overrideStyles</code>{' '}
        entry, which is why these are module-scope values rather than something
        built during render.
      </p>
      <CodeBlock title="vite.config.ts">{`import toned from '@toned/core/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { compactButtonStyles } from './compact-button.styles.ts'
import { linkButtonStyles } from './link-button.styles.ts'
import { buttonStyles } from './styles.ts'
import { ui } from './system.ts'

export default defineConfig({
  plugins: [
    toned({
      system: ui,
      sheets: [buttonStyles, linkButtonStyles, compactButtonStyles],
      inputs: ['system.ts', 'styles.ts', 'link-button.styles.ts', 'compact-button.styles.ts'],
    }),
    react(),
  ],
})`}</CodeBlock>

      <h2 {...s.h2} id="choosing">
        Choosing one
      </h2>
      <p>
        If the difference is a fixed set of choices, add a{' '}
        <Link to="/api/variants">variant</Link> to the sheet instead: it is
        typed at the call site and needs none of the above. Use{' '}
        <code {...s.code}>extend</code> for a related component with different
        defaults, <code {...s.code}>overrideSheet</code> when a value must hold
        whatever variant is selected, and{' '}
        <code {...s.code}>StyleOverrides</code> when the component is not yours
        to change or the change belongs to one region of the application. The{' '}
        <Link
          to="/learn/$topic"
          params={{ topic: 'react' }}
          hash="prop-bags-and-overrides"
        >
          React reference
        </Link>{' '}
        specifies the precedence in full.
      </p>
    </article>
  )
}
