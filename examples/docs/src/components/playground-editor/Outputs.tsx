import { useStyles } from '@toned/react'
import { useMemo } from 'react'
import { type CodeLanguage, highlight } from '../../highlight.ts'
import { playgroundEditorStyles } from '../../styles/playground-editor.ts'
import type { Compiled, SourceFiles, VariantValue } from './types.ts'
import { fileNames } from './types.ts'

/** Highlighting is synchronous; very large outputs stay plain to bound the cost. */
const HIGHLIGHT_LIMIT = 24_000
const DISPLAY_LIMIT = 60_000

function Code({
  code,
  lang,
  label,
}: {
  code: string
  lang: CodeLanguage
  label: string
}) {
  const s = useStyles(playgroundEditorStyles)
  const shown =
    code.length > DISPLAY_LIMIT ? code.slice(0, DISPLAY_LIMIT) : code
  const tokens = useMemo(
    () =>
      shown.length > HIGHLIGHT_LIMIT
        ? undefined
        : highlight(shown, lang).tokens,
    [shown, lang],
  )
  let offset = 0
  return (
    <pre
      {...s.OutputCode}
      role="region"
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the code region.
      tabIndex={0}
    >
      <code>
        {tokens
          ? tokens.map((line, index) => {
              const key = offset
              const spans = line.map((token) => {
                const spanKey = offset
                offset += token.content.length
                return (
                  <span key={spanKey} style={{ color: token.color }}>
                    {token.content}
                  </span>
                )
              })
              offset++
              return (
                <span key={key}>
                  {spans}
                  {index < tokens.length - 1 ? '\n' : null}
                </span>
              )
            })
          : shown}
      </code>
    </pre>
  )
}

function size(chars: number) {
  return chars > 1024 ? `${(chars / 1024).toFixed(1)} KB` : `${chars} chars`
}

export function ResolvedStyles({
  result,
  selection,
}: {
  result: Compiled
  selection: Record<string, VariantValue>
}) {
  const s = useStyles(playgroundEditorStyles)
  if (!result.sheets.length)
    return (
      <p {...s.Empty}>
        No exported stylesheets. Export them from styles.ts (for example{' '}
        <code>export const buttonStyles = stylesheet(…)</code>) to inspect what
        the renderer resolves.
      </p>
    )
  return (
    <div {...s.Output}>
      {result.sheets.map((entry) => {
        const variants = Object.fromEntries(
          entry.axes
            .filter((axis) => selection[axis] !== undefined)
            .map((axis) => [axis, selection[axis]]),
        )
        let json: string
        try {
          const resolved = result
            .renderFor(entry.sheet)
            ?.resolve(entry.sheet, { variants })
          json = JSON.stringify(resolved, null, 2)
        } catch (error) {
          json = `// ${error instanceof Error ? error.message : String(error)}`
        }
        return (
          <section key={entry.name} {...s.OutputSection}>
            <h3 {...s.OutputHead}>
              {entry.name}
              <span {...s.OutputMeta}>
                {entry.parts.length} parts · system “{entry.systemId}” ·{' '}
                {Object.keys(variants).length
                  ? Object.entries(variants)
                      .map(([axis, value]) => `${axis}=${String(value)}`)
                      .join(', ')
                  : 'defaults'}
              </span>
            </h3>
            <Code
              code={json}
              lang="json"
              label={`${entry.name} resolved output`}
            />
          </section>
        )
      })}
    </div>
  )
}

export function CompiledOutput({ output }: { output: Partial<SourceFiles> }) {
  const s = useStyles(playgroundEditorStyles)
  const files = fileNames.flatMap((file) => {
    const code = output[file]
    return code === undefined ? [] : [{ file, code }]
  })
  if (!files.length) return <p {...s.Empty}>Nothing compiled yet.</p>
  return (
    <div {...s.Output}>
      {files.map(({ file, code }) => (
        <section key={file} {...s.OutputSection}>
          <h3 {...s.OutputHead}>
            {file.replace(/\.tsx?$/, '.js')}
            <span {...s.OutputMeta}>
              TypeScript transpileModule · CommonJS · react-jsx
            </span>
          </h3>
          <Code code={code} lang="tsx" label={`Compiled ${file}`} />
        </section>
      ))}
    </div>
  )
}

export function GeneratedCss({ result }: { result: Compiled }) {
  const s = useStyles(playgroundEditorStyles)
  // The generator emits compact CSS; one rule per line reads better.
  const css = useMemo(
    () => result.css.replace(/\}(?!\s*\})/g, '}\n').trim(),
    [result.css],
  )
  return (
    <div {...s.Output}>
      <section {...s.OutputSection}>
        <h3 {...s.OutputHead}>
          buildStyles output
          <span {...s.OutputMeta}>
            {size(result.css.length)} · scoped to [data-toned-preview="
            {result.scope}"]
            {css.length > DISPLAY_LIMIT
              ? ` · showing the first ${size(DISPLAY_LIMIT)}`
              : ''}
          </span>
        </h3>
        <Code code={css} lang="css" label="Generated CSS" />
      </section>
    </div>
  )
}
