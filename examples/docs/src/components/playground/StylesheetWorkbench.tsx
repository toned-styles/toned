import type { SheetSource } from 'virtual:component-docs/*'
import {
  type StyleOverrideEntry,
  StyleOverrides,
  useStyles,
} from '@toned/react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Button } from '../../../../ui/src/components/ui/button.tsx'
import {
  type LiveRules,
  liveTokens,
  parseLiveStyles,
} from '../../lib/live-styles.ts'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'

export function StylesheetWorkbench({
  name,
  mod,
  children,
}: {
  name: string
  mod: Record<string, unknown>
  children: ReactNode
}) {
  const s = useStyles(libraryStyles)
  const [metadata, setMetadata] = useState<{
    source: string
    sheets: SheetSource[]
  } | null>(null)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let active = true
    import('virtual:component-docs/index')
      .then(async ({ loaders }) => loaders[name]?.())
      .then((result) => {
        if (active && result) setMetadata(result)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [name])
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<'stylesheet' | 'implementation' | 'edit'>(
    'stylesheet',
  )
  const [text, setText] = useState('{}')
  const [rules, setRules] = useState<LiveRules>({})
  const [announcement, setAnnouncement] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setAnnouncement(
          error
            ? `${error} Showing the last valid preview.`
            : 'Applied to this preview. Component state is preserved.',
        ),
      700,
    )
    return () => clearTimeout(timer)
  }, [error, rules])
  const sheet = metadata?.sheets[selected]
  const target = sheet ? mod[sheet.name] : undefined
  const overrides = useMemo<StyleOverrideEntry[]>(
    () =>
      target && typeof target === 'object' ? [{ sheet: target, rules }] : [],
    [target, rules],
  )
  function update(value: string) {
    setText(value)
    try {
      setRules(parseLiveStyles(value, sheet?.parts ?? []))
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }
  function reset() {
    setText('{}')
    setRules({})
    setError('')
  }
  return (
    <div {...s.workbench}>
      <StyleOverrides value={overrides}>{children}</StyleOverrides>
      <section {...s.panel} aria-label="Component stylesheet workbench">
        <div {...s.spread}>
          <div {...s.row} role="group" aria-label="Source views">
            {(['stylesheet', 'implementation', 'edit'] as const).map(
              (value) => (
                <Button
                  key={value}
                  variant={tab === value ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {value === 'edit'
                    ? 'Edit live'
                    : value === 'stylesheet'
                      ? 'Stylesheet'
                      : 'Implementation'}
                </Button>
              ),
            )}
          </div>
          <span {...s.muted}>{name}.tsx · actual source</span>
        </div>
        {loadError ? (
          <p role="alert">Source could not load. Reload to try again.</p>
        ) : !metadata ? (
          <p>Loading source…</p>
        ) : (
          <>
            {metadata.sheets.length > 1 && (
              <label {...s.stack}>
                Stylesheet
                <select
                  {...s.input}
                  value={selected}
                  onChange={(event) => {
                    setSelected(Number(event.target.value))
                    reset()
                  }}
                >
                  {metadata.sheets.map((item, index) => (
                    <option key={item.name} value={index}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {tab === 'edit' ? (
              sheet && target ? (
                <>
                  <div {...s.spread}>
                    <p {...s.muted}>
                      Edit token declarations as JSON. Valid changes apply as
                      you type, only to this preview.
                    </p>
                    <div {...s.row}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update(
                            JSON.stringify(
                              {
                                [sheet.parts[0]]: {
                                  borderRadius: 'full',
                                  shadow: 'large',
                                },
                              },
                              null,
                              2,
                            ),
                          )
                        }
                      >
                        Try rounded
                      </Button>
                      <Button size="sm" variant="ghost" onClick={reset}>
                        Reset styles
                      </Button>
                    </div>
                  </div>
                  <label {...s.label} htmlFor={`styles-${name}`}>
                    Live overrides · {sheet.name}
                  </label>
                  <textarea
                    id={`styles-${name}`}
                    {...s.editor}
                    value={text}
                    maxLength={8000}
                    spellCheck={false}
                    aria-invalid={!!error}
                    aria-describedby={`style-status-${name}`}
                    onChange={(event) => update(event.target.value)}
                  />
                  <p id={`style-status-${name}`} {...s.muted}>
                    {error
                      ? `${error} Showing the last valid preview.`
                      : Object.keys(rules).length
                        ? 'Applied to this preview. Component state is preserved.'
                        : 'Original stylesheet. Add overrides to start experimenting.'}
                  </p>
                  <p role="status" {...s.muted}>
                    {announcement}
                  </p>
                  <details>
                    <summary>Editable tokens and parts</summary>
                    <p {...s.muted}>
                      Parts: {sheet.parts.join(', ')}. Spacing: padding,
                      paddingX, paddingY, gap (0–24). Opacity: 0–1.
                    </p>
                    {Object.entries(liveTokens).map(([token, choices]) => (
                      <p key={token} {...s.muted}>
                        {token}: {choices.join(', ')}
                      </p>
                    ))}
                  </details>
                  <details>
                    <summary>Use this override in your app</summary>
                    <CodeBlock>{`import { overrideStyles, StyleOverrides } from '@toned/react'\n\nconst overrides = [overrideStyles(${sheet.name}, ${JSON.stringify(rules, null, 2)})]\n\n<StyleOverrides value={overrides}>\n  {/* Your components */}\n</StyleOverrides>`}</CodeBlock>
                  </details>
                </>
              ) : (
                <p {...s.muted}>
                  {sheet
                    ? 'This stylesheet is visible in the source but is not exported for live editing.'
                    : 'This component composes other primitives. Open their pages to edit the styles they own.'}
                </p>
              )
            ) : (
              <div {...s.source}>
                <CodeBlock>
                  {tab === 'implementation'
                    ? metadata.source
                    : (sheet?.source ??
                      '// This component composes primitives; it has no local stylesheet.\n' +
                        metadata.source)}
                </CodeBlock>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
