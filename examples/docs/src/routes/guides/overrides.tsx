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
        One verb changes a stylesheet without editing it:{' '}
        <code {...s.code}>sheet.extend(rules, variants?)</code>. It returns a
        new sheet and leaves the original as it was. Use the new sheet in a
        component of your own, or give it to{' '}
        <code {...s.code}>StyleOverrides</code> to restyle components you do not
        own inside one subtree.
      </p>
      <p>
        The examples change the button from{' '}
        <Link to="/getting-started">Getting Started</Link>: its{' '}
        <code {...s.code}>buttonStyles</code> sheet has an accent background and
        a <code {...s.code}>size</code> variant that sets the padding.
      </p>

      <h2 {...s.h2} id="extend">
        The extension wins
      </h2>
      <p>
        The rules of an extension sit in a layer above the sheet's variants. A
        value the extension sets holds whatever variant is selected; a value it
        does not mention is left to the original sheet. The new sheet keeps the
        same parts, variant axes and defaults.
      </p>
      <CodeBlock title="link-button.styles.ts">{`import { buttonStyles } from './styles.ts'

export const linkButtonStyles = buttonStyles.extend({
  // The background changes. The padding is still set by the size variants.
  Root: { background: 'neutral' },
})`}</CodeBlock>
      <p>
        <code {...s.code}>extend</code> restyles the parts a sheet has. Naming a
        part it does not have is a type error and a runtime error, and a part's{' '}
        <code {...s.code}>$kind</code> cannot change. A component with more
        parts needs a stylesheet of its own.
      </p>

      <h2 {...s.h2} id="variants">
        Restating variants and removing values
      </h2>
      <p>
        Because the extension wins, a value it sets is the same for every
        variant. To vary it again, pass a second argument: variant rules over
        the axes the sheet already has. Those win over everything.{' '}
        <code {...s.code}>null</code> removes the inherited value at that exact
        place.
      </p>
      <CodeBlock title="compact-button.styles.ts">{`import { buttonStyles } from './styles.ts'

export const compactButtonStyles = buttonStyles.extend(
  {
    // Wins over the padding that both size variants set.
    Root: { padding: 1 },
    // Removes the base value. A variant that sets text still applies.
    Label: { text: null },
  },
  $ => ({
    // Restated for one size, above the rules of the extension.
    [$.size('m')]: { Root: { padding: 2 }, Label: { text: 'caption' } },
  }),
)`}</CodeBlock>
      <p>
        The rules can also be a callback,{' '}
        <code {...s.code}>{'q => ({ … })'}</code>, over the sheet's query
        builder. A derived sheet is an ordinary sheet. Bind it like the
        original:
      </p>
      <CodeBlock title="CompactButton.tsx">{`import { createElements } from '@toned/react'
import { compactButtonStyles } from './compact-button.styles.ts'

const S = createElements(compactButtonStyles)

export function CompactButton({ label, size = 'm' }: {
  label: string
  size?: 's' | 'm'
}) {
  return (
    <S size={size}>
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
        <code {...s.code}>StyleOverrides</code> takes the same kind of derived
        sheet. A component inside it that renders{' '}
        <code {...s.code}>buttonStyles</code> resolves the derived sheet
        instead, without being changed itself. An entry written as{' '}
        <code {...s.code}>{'{ sheet, scope }'}</code> applies only where the
        host's ambient scope matches. Declare the list at module scope so it is
        the same array on every render.
      </p>
      <CodeBlock title="Toolbar.tsx">{`import { StyleOverrides } from '@toned/react'
import { Button } from './Button.tsx'
import { buttonStyles } from './styles.ts'

const toolbarOverrides = [
  buttonStyles.extend({ Root: { background: 'neutral' } }, $ => ({
    [$.size('s')]: { Root: { padding: 2 } },
  })),
  // Applies only where the ambient scope matches 'editor/toolbar'.
  {
    sheet: buttonStyles.extend({ Root: { padding: 3 } }),
    scope: 'editor/toolbar',
  },
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
        An entry applies to the sheet it was derived from. One derived from{' '}
        <code {...s.code}>buttonStyles</code> does not reach a component that
        renders <code {...s.code}>compactButtonStyles</code>; derive from that
        sheet for its own entry. Nested <code {...s.code}>StyleOverrides</code>{' '}
        add to the outer ones, and the later entry wins where both set a value.
        Passing a sheet that was not derived throws.
      </p>

      <h2 {...s.h2} id="build">
        Include derived sheets in the build
      </h2>
      <p>
        A sheet from <code {...s.code}>extend</code> that adds a condition, a
        state or web rules needs CSS of its own. List it in the build's sheets
        with the others. The same holds for a sheet given to{' '}
        <code {...s.code}>StyleOverrides</code>, which is why these are
        module-scope values rather than something built during render.
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
        <code {...s.code}>extend</code> for a related component of your own, and
        give the derived sheet to <code {...s.code}>StyleOverrides</code> when
        the component is not yours to change or the change belongs to one region
        of the application. The{' '}
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
