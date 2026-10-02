import {
  type StyleOverride,
  StyleOverrides,
  useStyles,
} from '@toned/react'
import { type ReactNode, useEffect, useId, useMemo, useState } from 'react'
import type { SheetSource } from 'virtual:component-docs/*'

import { Button } from '../../../../ui/src/components/ui/button.tsx'
import {
  NativeSelect,
  NativeSelectOption,
} from '../../../../ui/src/components/ui/native-select.tsx'
import {
  type LiveRules,
  liveTokens,
  parseLiveStyles,
} from '../../lib/live-styles.ts'
import { playgroundStyles } from '../../styles/playground.ts'
import { CodeBlock } from '../CodeBlock.tsx'

const tabs = [
  ['stylesheet', 'Stylesheet'],
  ['implementation', 'Implementation'],
  ['edit', 'Edit live'],
] as const
type Tab = (typeof tabs)[number][0]

/**
 * A component page's two halves: the preview with its prop controls, and the
 * component's source with a live editor. Overrides from the editor apply to
 * the preview only; the controls and this panel keep the original styles.
 */
export function StylesheetWorkbench({
  name,
  mod,
  controls,
  children,
}: {
  name: string
  mod: Record<string, unknown>
  /** Prop controls, shown under the preview. */
  controls?: ReactNode
  children: ReactNode
}) {
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
  const [tab, setTab] = useState<Tab>('stylesheet')
  const [text, setText] = useState('{}')
  const [rules, setRules] = useState<LiveRules>({})
  const [announcement, setAnnouncement] = useState('')
  const [error, setError] = useState('')
  const applied = Object.keys(rules).length > 0
  const s = useStyles(playgroundStyles, {
    status: error ? 'invalid' : applied ? 'applied' : 'idle',
  })
  const pickerId = useId()
  // Screen readers hear the result once typing pauses, not on every key.
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
  // parseLiveStyles has already limited the rules to this sheet's parts and
  // the playground's tokens, so extend() is given nothing it would refuse.
  const overrides = useMemo<StyleOverride[]>(
    () =>
      target &&
      typeof target === 'object' &&
      'extend' in target &&
      typeof target.extend === 'function'
        ? [target.extend(rules) as object]
        : [],
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
      <div {...s.column}>
        <StyleOverrides value={overrides}>{children}</StyleOverrides>
        {controls}
      </div>
      <section
        {...s.panel}
        aria-label="Component stylesheet workbench"
        data-gallery-chrome
      >
        <div {...s.panelBar}>
          <div {...s.tabs} role="group" aria-label="Source views">
            {tabs.map(([value, label]) => (
              <Button
                key={value}
                variant={tab === value ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <span {...s.fileName}>{name}.tsx</span>
        </div>
        {loadError ? (
          <div {...s.panelBody}>
            <p role="alert" {...s.hint}>
              The source could not load. Reload the page to try again.
            </p>
          </div>
        ) : !metadata ? (
          <div {...s.panelBody}>
            <p {...s.loading}>Loading source…</p>
          </div>
        ) : (
          <>
            {metadata.sheets.length > 1 && tab !== 'implementation' && (
              <div {...s.sheetPicker}>
                <label htmlFor={pickerId}>Stylesheet</label>
                <NativeSelect
                  id={pickerId}
                  size="sm"
                  value={selected}
                  onChange={(event) => {
                    setSelected(Number(event.target.value))
                    reset()
                  }}
                >
                  {metadata.sheets.map((item, index) => (
                    <NativeSelectOption key={item.name} value={index}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}
            {tab === 'edit' ? (
              <div {...s.panelBody}>
                {sheet && target ? (
                  <>
                    <div {...s.spread}>
                      <label {...s.editorLabel} htmlFor={`styles-${name}`}>
                        Live overrides · {sheet.name}
                      </label>
                      <div {...s.actions}>
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
                    <p id={`style-status-${name}`} {...s.status}>
                      {error
                        ? `${error} Showing the last valid preview.`
                        : applied
                          ? 'Applied to this preview. Component state is preserved.'
                          : 'Edit token declarations as JSON. Valid changes apply as you type, to this preview only.'}
                    </p>
                    <p role="status" className="visually-hidden">
                      {announcement}
                    </p>
                    <details {...s.details}>
                      <summary {...s.summary}>
                        Editable parts and tokens
                      </summary>
                      <div {...s.detailBody}>
                        <p>
                          Parts:{' '}
                          <span {...s.token}>{sheet.parts.join(', ')}</span>
                        </p>
                        <p>
                          Spacing (0–24):{' '}
                          <span {...s.token}>
                            padding, paddingX, paddingY, gap
                          </span>
                        </p>
                        <p>
                          Opacity (0–1): <span {...s.token}>opacity</span>
                        </p>
                        {Object.entries(liveTokens).map(([token, choices]) => (
                          <p key={token}>
                            {token}:{' '}
                            <span {...s.token}>{choices.join(', ')}</span>
                          </p>
                        ))}
                      </div>
                    </details>
                    <details {...s.details}>
                      <summary {...s.summary}>
                        Use this override in your app
                      </summary>
                      <CodeBlock>{`import { StyleOverrides } from '@toned/react'\n\nconst overrides = [${sheet.name}.extend(${JSON.stringify(rules, null, 2)})]\n\n<StyleOverrides value={overrides}>\n  {/* Your components */}\n</StyleOverrides>`}</CodeBlock>
                    </details>
                  </>
                ) : (
                  <p {...s.hint}>
                    {sheet
                      ? 'This stylesheet is shown in the source but is not exported, so it cannot be edited here.'
                      : 'This component composes other components and has no stylesheet of its own. Open their pages to edit the styles they own.'}
                  </p>
                )}
              </div>
            ) : (
              <div {...s.source}>
                <CodeBlock bare>
                  {tab === 'implementation'
                    ? metadata.source
                    : (sheet?.source ??
                      '// This component composes other components; it has no stylesheet of its own.\n' +
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
