import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { Fragment, type ReactNode, useMemo, useState } from 'react'
import { highlight } from '../../highlight.ts'
import { choiceStyles, homeStyles, tourStyles } from '../../styles/home.ts'

type Scenario = {
  id: string
  name: string
  file: string
  summary: string
  code: string
  /** The text the editor marks, on its first occurrence in `code`. */
  mark: string
  tone: 'info' | 'error'
  popup: ReactNode
}

function Rows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  const s = useStyles(tourStyles)
  return (
    <dl {...s.Rows}>
      {rows.map(([label, value]) => (
        <div key={label} {...s.Row}>
          <dt {...s.RowLabel}>{label}</dt>
          <dd {...s.RowValue}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Problem({ source, children }: { source: string; children: string }) {
  const s = useStyles(tourStyles)
  return (
    <>
      <p {...s.ProblemSource}>{source}</p>
      <p {...s.ProblemText}>{children}</p>
    </>
  )
}

const sheetHead = 'export const noticeStyles = stylesheet({\n'
const sheetTail =
  "\n  Badge: { $kind: 'text', fill: 'info', shape: 'pill', text: 'label' },"

// Every popup is what the tool prints for this code: the language server's
// completions and hover, the TypeScript compiler's errors, the lint rule's
// message.
const scenarios: readonly Scenario[] = [
  {
    id: 'complete',
    name: 'Autocomplete',
    file: 'styles.ts',
    summary: 'Completion offers the values a token allows, and only those.',
    code: `${sheetHead}  Root: { tint: '', shape: 'card', stack: 8 },${sheetTail}`,
    mark: "''",
    tone: 'info',
    popup: (
      <Rows
        rows={[
          ['info', 'ui.tint'],
          ['success', 'ui.tint'],
          ['danger', 'ui.tint'],
        ]}
      />
    ),
  },
  {
    id: 'hover',
    name: 'Hover',
    file: 'styles.ts',
    summary: 'Hover a declaration to see its token and where it is defined.',
    code: `${sheetHead}  Root: { tint: 'info', shape: 'card', stack: 8 },${sheetTail}`,
    mark: 'tint',
    tone: 'info',
    popup: (
      <Rows
        rows={[
          ['Declaration', 'noticeStyles / Root / tint'],
          ['Token', 'tint · 3 values'],
          ['Allowed values', 'info, success, danger'],
          ['Defined in', 'system.ts:28'],
        ]}
      />
    ),
  },
  {
    id: 'value',
    name: 'Wrong value',
    file: 'styles.ts',
    summary: 'A value the token does not list is a compile error.',
    code: `${sheetHead}  Root: { tint: 'sucess', shape: 'card', stack: 8 },${sheetTail}`,
    mark: "'sucess'",
    tone: 'error',
    popup: (
      <Problem source="TypeScript · TS2820">
        {`Type '"sucess"' is not assignable to type '"danger" | "success" | "info" | undefined'. Did you mean '"success"'?`}
      </Problem>
    ),
  },
  {
    id: 'variant',
    name: 'Wrong variant',
    file: 'Notice.tsx',
    summary: 'Variants are typed props, so a tone that does not exist fails.',
    code: 'const Parts = createElements(noticeStyles)\n\n<Parts tone="warning" size="compact">\n  <Parts.Root>…</Parts.Root>\n</Parts>',
    mark: '"warning"',
    tone: 'error',
    popup: (
      <Problem source="TypeScript · TS2322">
        {`Type '"warning"' is not assignable to type '"danger" | "success" | "info"'.`}
      </Problem>
    ),
  },
  {
    id: 'lint',
    name: 'Lint',
    file: 'Notice.tsx',
    summary: 'Lint rules for ESLint and Oxlint catch mistakes types cannot.',
    code: 'export function Notice() {\n  const Parts = createElements(noticeStyles)\n  return <Parts>…</Parts>\n}',
    mark: 'createElements(noticeStyles)',
    tone: 'error',
    popup: (
      <Problem source="toned/react/no-create-elements-in-render">
        createElements creates new component identities here and can remount
        children. Declare the family at module scope; pass changing variants
        through its provider.
      </Problem>
    ),
  },
]

function Tab({
  scenario,
  selected,
  onSelect,
}: {
  scenario: Scenario
  selected: boolean
  onSelect: () => void
}) {
  const s = useStyles(choiceStyles, { selected })
  return (
    <button
      type="button"
      role="tab"
      id={`tour-tab-${scenario.id}`}
      aria-selected={selected}
      aria-controls="tour-panel"
      {...s.Button}
      onClick={onSelect}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      {scenario.name}
    </button>
  )
}

/** Highlighted lines, with the marked text wrapped and the popup after it. */
function Editor({ scenario }: { scenario: Scenario }) {
  const s = useStyles(tourStyles, { tone: scenario.tone })
  const lines = useMemo(
    () => highlight(scenario.code, 'tsx').tokens,
    [scenario.code],
  )
  const at = scenario.code.indexOf(scenario.mark)
  const before = scenario.code.slice(0, at).split('\n')
  const markLine = before.length - 1
  const from = before[markLine].length
  const to = from + scenario.mark.length

  return (
    <div {...s.Code}>
      {lines.map((line, index) => {
        let column = 0
        const marked = index === markLine
        const key = `${scenario.id}-${index}`
        return (
          <Fragment key={key}>
            <div {...s.Line}>
              {line.length === 0 ? ' ' : null}
              {line.map((token) => {
                const start = column
                column += token.content.length
                const style = { color: token.color }
                if (!marked || column <= from || start >= to)
                  return (
                    <span key={start} style={style}>
                      {token.content}
                    </span>
                  )
                const a = Math.max(from - start, 0)
                const b = Math.min(to - start, token.content.length)
                return (
                  <span key={start} style={style}>
                    {token.content.slice(0, a)}
                    <span {...s.Mark} data-testid="tour-mark">
                      {token.content.slice(a, b)}
                    </span>
                    {token.content.slice(b)}
                  </span>
                )
              })}
            </div>
            {marked ? (
              <div {...s.Popup} data-testid="tour-popup">
                {scenario.popup}
              </div>
            ) : null}
          </Fragment>
        )
      })}
    </div>
  )
}

const tools = [
  { name: 'Language server', topic: 'compiler' },
  { name: 'VS Code extension', topic: 'compiler' },
  { name: 'ESLint and Oxlint rules', topic: 'compiler' },
] as const

/** What the editor shows while you write Toned, one case at a time. */
export function Tooling() {
  const s = useStyles(homeStyles)
  const t = useStyles(tourStyles)
  const [id, setId] = useState(scenarios[0].id)
  const scenario = scenarios.find((item) => item.id === id) ?? scenarios[0]

  return (
    <section {...s.Section} id="tooling" aria-labelledby="tooling-title">
      <div {...s.SectionIntro}>
        <p {...s.Eyebrow}>Developer experience</p>
        <h2 id="tooling-title" {...s.Heading}>
          Your editor knows the design system
        </h2>
        <p {...s.Body}>
          The language server, the compiler and the lint rules all read the
          tokens you defined. Hover a case to see what each one reports.
        </p>
      </div>
      <div {...t.Tour}>
        <div {...t.Tabs} role="tablist" aria-label="Editor features">
          {scenarios.map((item) => (
            <Tab
              key={item.id}
              scenario={item}
              selected={item.id === id}
              onSelect={() => setId(item.id)}
            />
          ))}
        </div>
        <div
          {...t.Window}
          role="tabpanel"
          id="tour-panel"
          aria-labelledby={`tour-tab-${scenario.id}`}
        >
          <div {...t.TitleBar}>
            <span {...t.FileName}>{scenario.file}</span>
            <span {...t.Summary}>{scenario.summary}</span>
          </div>
          <Editor scenario={scenario} />
        </div>
      </div>
      <div {...s.Links}>
        {tools.map((tool) => (
          <Link
            key={tool.name}
            to="/learn/$topic"
            params={{ topic: tool.topic }}
            {...s.TextLink}
          >
            {tool.name}
          </Link>
        ))}
        <Link to="/playground" {...s.TextLink}>
          Try it in the playground
        </Link>
      </div>
    </section>
  )
}
