import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/conditions')({
  component: ApiConditions,
})

/** A cell is prose, or `code` shown as a key. An empty code cell has no such form. */
type Cell = string | { code: string }
const k = (code: string): Cell => ({ code })

function KeyTable({
  label,
  head,
  rows,
}: {
  label: string
  head: string[]
  rows: Cell[][]
}) {
  const s = useStyles(proseStyles)
  return (
    <div
      {...s.tableScroll}
      role="region"
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll a wide table.
      tabIndex={0}
    >
      <table {...s.table}>
        <thead>
          <tr>
            {head.map((title) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>
                  {typeof cell === 'string' ? (
                    cell
                  ) : cell.code ? (
                    <code {...s.code}>{cell.code}</code>
                  ) : (
                    '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ApiConditions() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Conditions and selectors</h1>
      <p>
        Every key a stylesheet accepts besides part names and tokens: states,
        breakpoints, containers, platforms, other parts, variant selectors and
        the <code {...s.code}>$</code> fields. Each entry gives the forms a key
        can be written in and which form to prefer.
      </p>

      <h2 {...s.h2} id="how-to-read-a-key">
        How to read a key
      </h2>
      <p>The first character says what kind of key it is:</p>
      <KeyTable
        label="Key prefixes"
        head={['Prefix', 'Kind', 'Example']}
        rows={[
          [k(':'), 'A state of the part', k("':hover'")],
          [
            k('@'),
            'A condition: viewport, container or platform',
            k("'@media md'"),
          ],
          [k('Part:'), 'A state of another part', k("'Root:hover'")],
          [k('[…]'), 'A variant selector, written with $', k("$.size('s')")],
          [k('$'), 'A field that is not a token', k('$kind')],
        ]}
      />
      <p>
        A condition has up to three spellings, and all three declare the same
        rule. The <strong>builder</strong> is a call on{' '}
        <code {...s.code}>q</code>, which the stylesheet callback receives:{' '}
        <code {...s.code}>[q.media('md')]</code>. Its arguments are checked
        against the system and completed by the editor. The{' '}
        <strong>alias</strong> is the same condition as a string:{' '}
        <code {...s.code}>'@media md'</code>. The <strong>short key</strong>,{' '}
        <code {...s.code}>'@md'</code>, is the string the builder returns and
        the alias is rewritten to before the sheet is compiled.
      </p>
      <p>
        Use the alias or the builder. The short keys are the earlier spelling;
        they remain valid and existing sheets need no change.
      </p>

      <h2 {...s.h2} id="example">
        Example
      </h2>
      <p>One sheet, written with aliases:</p>
      <CodeBlock title="styles.ts">{`import { stylesheet } from './system.ts'

export const cardStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    fill: 'surface',
    padding: 2,
    ':hover': { fill: 'accent' },
    ':focus-visible': { fill: 'accent' },
    ':open': { fill: 'accent-strong' },
    '@media md': { padding: 4 },
    '@container card wide': { padding: 6 },
    // Escape hatch: a web-only property that no token covers.
    '@platform web': { $style: { cursor: 'pointer' } },
  },
  Hint: { $kind: 'text', opacity: 0 },

  // At the sheet root, one condition holds rules for several parts.
  'Root:hover': { Hint: { opacity: 1 } },
  '@media lg': { Root: { padding: 6 }, Hint: { opacity: 0.6 } },
})`}</CodeBlock>
      <p>
        The same conditions from the builder. Pass a function to{' '}
        <code {...s.code}>stylesheet</code> to receive{' '}
        <code {...s.code}>q</code>. The builder is also the only way to combine
        conditions or to use a width the system does not name:
      </p>
      <CodeBlock title="builder.ts">{`import { dp } from '@toned/core'
import { stylesheet } from './system.ts'

export const cardStyles = stylesheet(q => ({
  Root: {
    $kind: 'pressable',
    fill: 'surface',
    padding: 2,
    [q.state('hover')]: { fill: 'accent' },
    [q.state('open')]: { fill: 'accent-strong' },
    [q.media('md')]: { padding: 4 },
    [q.container('card', 'wide')]: { padding: 6 },
    // A width with no declared name.
    [q.media(dp(600))]: { padding: 4 },
    // Wide viewport, and not hovered.
    [q.all(q.media('lg'), q.not(q.state('hover')))]: { fill: 'surface' },
    [q.platform('web')]: { $style: { cursor: 'pointer' } },
  },
  Hint: { $kind: 'text', opacity: 0 },

  [q.part('Root').state('hover')]: { Hint: { opacity: 1 } },
  [q.media('lg')]: { Root: { padding: 6 }, Hint: { opacity: 0.6 } },
}))`}</CodeBlock>
      <p>
        Both sheets use this system. Breakpoints, containers and extra states
        are declared under <code {...s.code}>conditions</code>; a key that names
        anything else is a type error.
      </p>
      <CodeBlock title="system.ts">{`import { defineSystem, defineToken } from '@toned/core'

const fills = {
  surface: '#ffffff',
  accent: '#315bd6',
  'accent-strong': '#2447b3',
} as const

export const ui = defineSystem({
  id: 'shop',
  tokens: {
    fill: defineToken({
      values: ['surface', 'accent', 'accent-strong'] as const,
      resolve: (value: keyof typeof fills) => ({ backgroundColor: fills[value] }),
    }),
    padding: defineToken({
      values: [2, 4, 6] as const,
      resolve: step => ({ padding: step * 4 }),
    }),
    opacity: defineToken({
      values: [0, 0.6, 1] as const,
      resolve: opacity => ({ opacity }),
    }),
  },
  conditions: {
    // Viewport widths, in logical pixels.
    media: { md: 768, lg: 1024 },
    // Named containers and their width steps.
    containers: { card: { wide: 448 } },
    // Extra states: a name and the selector that marks it.
    states: { open: '[data-state="open"]' },
  },
})

export const { stylesheet } = ui`}</CodeBlock>

      <h2 {...s.h2} id="states">
        States
      </h2>
      <p>
        A state key goes inside a part and applies while that part is in the
        state.
      </p>
      <KeyTable
        label="State keys"
        head={['Key', 'Builder', 'Applies while']}
        rows={[
          [
            k("':hover'"),
            k("q.state('hover')"),
            'the pointer is over the part',
          ],
          [k("':active'"), k("q.state('active')"), 'the part is being pressed'],
          [k("':focus'"), k("q.state('focus')"), 'the part has focus'],
          [
            k("':focus-visible'"),
            k("q.state('focus-visible')"),
            'the part has focus and the browser shows a focus indicator',
          ],
          [
            k("':focus-within'"),
            k("q.state('focus-within')"),
            'the part or something inside it has focus',
          ],
          [
            k("':open'"),
            k("q.state('open')"),
            'the part matches a state declared in conditions.states',
          ],
          [
            k("':open:hover'"),
            k("q.all(q.state('open'), q.state('hover'))"),
            'both states hold',
          ],
        ]}
      />
      <p>
        On the web the states are CSS: no event listeners are attached.{' '}
        <code {...s.code}>':focus-visible'</code> and{' '}
        <code {...s.code}>':focus-within'</code> have no event to pair with on
        React Native, so a native host must supply them. See{' '}
        <Link to="/guides/interactive">Interactive styles</Link>.
      </p>

      <h2 {...s.h2} id="viewport-and-containers">
        Viewport and containers
      </h2>
      <KeyTable
        label="Viewport and container keys"
        head={['Builder', 'Alias', 'Short key', 'Applies when']}
        rows={[
          [
            k("q.media('md')"),
            k("'@media md'"),
            k("'@md'"),
            'the viewport is at least as wide as the md breakpoint',
          ],
          [
            k('q.media(dp(600))'),
            k(''),
            k("'@>=600px'"),
            'the viewport is at least 600 logical pixels wide',
          ],
          [
            k("q.container('card', 'wide')"),
            k("'@container card wide'"),
            k("'@card/wide'"),
            'the nearest card container is at least as wide as its wide step',
          ],
          [
            k("q.container('card', dp(300))"),
            k(''),
            k("'@card/>=300px'"),
            'the nearest card container is at least 300 logical pixels wide',
          ],
        ]}
      />
      <p>
        Every condition is a minimum width, so declarations read from narrow to
        wide: the base value first, then the breakpoints that replace it. A part
        becomes a container by setting{' '}
        <code {...s.code}>container: 'card'</code> on it. The fixed-width forms
        take <code {...s.code}>dp()</code> from{' '}
        <code {...s.code}>@toned/core</code>; write them through the builder so
        the number is checked.{' '}
        <Link to="/api/media-queries">Media queries</Link> covers breakpoints in
        more detail.
      </p>

      <h2 {...s.h2} id="platforms">
        Platforms
      </h2>
      <KeyTable
        label="Platform keys"
        head={['Builder', 'Alias', 'Short key', 'Applies on']}
        rows={[
          [
            k("q.platform('web')"),
            k("'@platform web'"),
            k("'@platform.web'"),
            'the web',
          ],
          [
            k("q.platform('native')"),
            k("'@platform native'"),
            k("'@platform.native'"),
            'React Native',
          ],
        ]}
      />
      <p>
        Outside a platform block, <code {...s.code}>$style</code> accepts only
        fields that mean the same on both platforms. Inside one it accepts that
        platform's own properties, which is why a web-only property such as{' '}
        <code {...s.code}>cursor</code> is written there.
      </p>

      <h2 {...s.h2} id="other-parts">
        Other parts
      </h2>
      <p>
        These keys go at the sheet root, or inside a variant rule, and hold
        rules for any of the sheet's parts.
      </p>
      <KeyTable
        label="Cross-part keys"
        head={['Key', 'Builder', 'Applies while']}
        rows={[
          [
            k("'Root:hover'"),
            k("q.part('Root').state('hover')"),
            'Root is hovered; styles Root and the parts inside it',
          ],
          [
            k("'Root~:hover'"),
            k(''),
            'Root is hovered; styles the parts that follow it as siblings',
          ],
          [
            k(''),
            k("q.part('Root').has('Item', 'open')"),
            'an Item part inside Root is in the state',
          ],
        ]}
      />
      <p>
        The key names one part and one state. To depend on several, combine
        builder calls with <code {...s.code}>q.all</code> or{' '}
        <code {...s.code}>q.any</code>. Parts that depend on one another must be
        rendered inside the same{' '}
        <Link to="/api/use-styles">element family</Link> or{' '}
        <code {...s.code}>useStyles</code> call.
      </p>

      <h2 {...s.h2} id="combining-conditions">
        Combining conditions
      </h2>
      <KeyTable
        label="Combining builders"
        head={['Builder', 'Applies when']}
        rows={[
          [k('q.all(a, b)'), 'every condition holds'],
          [k('q.any(a, b)'), 'at least one condition holds'],
          [k('q.not(a)'), 'the condition does not hold'],
        ]}
      />
      <p>
        They take any builder result, including a variant selector such as{' '}
        <code {...s.code}>$.size('s')</code>, and nest. The keys they return are
        generated strings: always use them as computed keys, never copy them
        out.
      </p>

      <h2 {...s.h2} id="variant-selectors">
        Variant selectors
      </h2>
      <p>
        Inside <code {...s.code}>.variants()</code>, the first callback argument
        builds the keys that select on the component's variant values.
      </p>
      <CodeBlock title="button.styles.ts">{`import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

type ButtonVariants = { size: 's' | 'm'; tone: 'plain' | 'accent'; busy?: boolean }

export const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', fill: 'surface', padding: 4 },
}).variants(($: Variants<ButtonVariants>, q) => ({
  // A fragment: no selector of its own, reused through $compose.
  [$('dimmed')]: { Root: { opacity: 0.6 } },

  [$.size('s')]: { Root: { padding: 2 } },
  [$.tone('accent')]: { Root: { fill: 'accent' } },
  // Both values must be selected.
  [$.size('s').tone('accent')]: { Root: { fill: 'accent-strong' } },
  [$.busy(true)]: { $compose: 'dimmed' },
  // A variant and a condition together.
  [q.all($.tone('accent'), q.media('md'))]: { Root: { padding: 6 } },
}), { defaults: { size: 'm', tone: 'plain' } })`}</CodeBlock>
      <KeyTable
        label="Variant selector keys"
        head={['Builder', 'Key it returns', 'Selects']}
        rows={[
          [k("$.size('s')"), k("'[size=s]'"), 'one value of one axis'],
          [
            k("$.size('s').tone('accent')"),
            k("'[size=s][tone=accent]'"),
            'both values at once; the order of the calls does not matter',
          ],
          [k('$.busy(true)'), k("'[busy=true]'"), 'a boolean axis'],
          [
            k("$('dimmed')"),
            k(''),
            'nothing: it names a fragment for $compose',
          ],
        ]}
      />
      <p>
        Write selectors with <code {...s.code}>$</code>: its arguments are
        checked against the <code {...s.code}>Variants</code> annotation. See{' '}
        <Link to="/api/variants">variants</Link> for defaults, precedence and
        fragments.
      </p>

      <h2 {...s.h2} id="fields">
        Fields that start with $
      </h2>
      <KeyTable
        label="Dollar fields"
        head={['Field', 'Earlier spelling', 'Holds']}
        rows={[
          [
            k('$kind'),
            k('$$type'),
            "the part's kind: 'view' (the default), 'text', 'image' or 'pressable'",
          ],
          [
            k('$style'),
            k('style'),
            'raw style fields for the few properties no token covers',
          ],
          [
            k('$compose'),
            k(''),
            'in a variant rule: fragments or parts whose rules are copied in',
          ],
          [
            k('$grid, $area'),
            k(''),
            'web only: a typed grid and the area a part occupies',
          ],
          [
            k('$webRules'),
            k(''),
            'web only: rules for pseudo-elements and DOM selectors',
          ],
        ]}
      />
      <p>
        <code {...s.code}>$kind</code> is fixed for a part: it cannot be set
        inside a state, condition or variant rule.{' '}
        <code {...s.code}>$webRules</code> takes the result of{' '}
        <code {...s.code}>webRules()</code> and belongs in a web platform block:
      </p>
      <CodeBlock title="field.styles.ts">{`import { webRules } from '@toned/core'
import { stylesheet } from './system.ts'

export const fieldStyles = stylesheet({
  Label: {
    $kind: 'text',
    opacity: 1,
    '@platform web': {
      // Selector escape hatch: a pseudo-element cannot be a part.
      $webRules: webRules({ '&::after': { content: '" *"' } }),
    },
  },
})`}</CodeBlock>
      <p>
        The grid fields are shown working in the{' '}
        <Link to="/examples" hash="grid">
          grid example
        </Link>{' '}
        and specified in the{' '}
        <Link
          to="/learn/$topic"
          params={{ topic: 'core' }}
          hash="typed-web-grid"
        >
          core reference
        </Link>
        .
      </p>

      <h2 {...s.h2} id="where-keys-go">
        Where a key may appear
      </h2>
      <KeyTable
        label="Key placement"
        head={['Place', 'Accepts', 'Its block holds']}
        rows={[
          [
            'Inside a part',
            'states, viewport, container, platform, combined conditions',
            'tokens and $style for that part',
          ],
          [
            'The sheet root',
            'viewport, container, platform, other parts, combined conditions',
            'a map of parts',
          ],
          [
            'A variant rule',
            'the same keys as the sheet root, beside its parts',
            'a map of parts',
          ],
          [
            't()',
            'states and viewport, one level deep',
            'tokens for the element',
          ],
        ]}
      />
      <p>
        At the sheet root a bare <code {...s.code}>q.state('hover')</code> has
        no part to belong to; name the part with{' '}
        <code {...s.code}>q.part('Root').state('hover')</code>. Rules in a sheet
        apply in the order they are written, and a later matching rule wins.
      </p>

      <h2 {...s.h2} id="earlier-spellings">
        Earlier spellings
      </h2>
      <p>
        These remain valid, compile to the same rules, and can be mixed with the
        current forms. The lint rule{' '}
        <code {...s.code}>toned/prefer-canonical-declarations</code> reports{' '}
        <code {...s.code}>style</code> and <code {...s.code}>$$type</code> and
        can rename them.
      </p>
      <KeyTable
        label="Earlier spellings"
        head={['Earlier', 'Current']}
        rows={[
          [k("'@md'"), k("'@media md' or q.media('md')")],
          [
            k("'@card/wide'"),
            k("'@container card wide' or q.container('card', 'wide')"),
          ],
          [k("'@platform.web'"), k("'@platform web' or q.platform('web')")],
          [k('$$type'), k('$kind')],
          [k('style'), k('$style')],
          [
            k("bp(), cq(), and(), or(), not() from '@toned/core/compat'"),
            k('q.media, q.container, q.all, q.any, q.not'),
          ],
          [
            k('.variants<Mods>($ => …)'),
            k('.variants(($: Variants<Mods>) => …)'),
          ],
        ]}
      />
    </article>
  )
}
