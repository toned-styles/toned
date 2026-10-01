import { useStyles } from '@toned/react'
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { playgroundEditorStyles } from '../../styles/playground-editor.ts'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor.tsx'
import type { LanguageProblem } from './language/protocol.ts'
import { useLanguage } from './language/useLanguage.ts'
import { CompiledOutput, GeneratedCss, ResolvedStyles } from './Outputs.tsx'
import { PreviewStage } from './Preview.tsx'
import { defaultPreset, findPreset, presets } from './presets.ts'
import {
  type Axis,
  type Compiled,
  type FileName,
  fileLayers,
  fileNames,
  MAX_FILE_CHARS,
  type Problem,
  type SourceFiles,
  type VariantValue,
} from './types.ts'

// v2 drafts hold three files. A v1 draft (two files, with the system inside
// `styles.ts`) cannot become a three-layer example, so it is discarded.
const STORAGE_KEY = 'toned-playground:draft:v2'
const RETIRED_STORAGE_KEYS = ['toned-playground:draft:v1']
const noProblems: readonly LanguageProblem[] = []
const DEBOUNCE_MS = 300

type InspectorTab = 'preview' | 'resolved' | 'compiled' | 'css'
const inspectorTabs: readonly { id: InspectorTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'resolved', label: 'Resolved styles' },
  { id: 'compiled', label: 'Compiled JS' },
  { id: 'css', label: 'CSS' },
]
const frames = { fill: 'Fill', '360': '360px', '560': '560px' } as const
type Frame = keyof typeof frames

type Status =
  | { kind: 'loading'; label: string }
  | { kind: 'ok'; ms: number }
  | { kind: 'error'; label: string }

const problemTitles: Record<Problem['kind'], string> = {
  syntax: 'Syntax error',
  import: 'Import error',
  module: 'Module error',
  runtime: 'Runtime error',
  render: 'Render error',
  limit: 'File too large',
}

function readDraft(): { preset: string; files: SourceFiles } | undefined {
  try {
    for (const key of RETIRED_STORAGE_KEYS) window.localStorage.removeItem(key)
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const draft = JSON.parse(raw) as {
      preset?: unknown
      files?: Record<string, unknown>
    }
    if (typeof draft.preset !== 'string' || !findPreset(draft.preset))
      return undefined
    const files = {} as SourceFiles
    for (const file of fileNames) {
      const text = draft.files?.[file]
      if (typeof text !== 'string' || text.length > MAX_FILE_CHARS * 2)
        return undefined
      files[file] = text
    }
    return { preset: draft.preset, files }
  } catch {
    return undefined
  }
}

function writeDraft(preset: string, files: SourceFiles) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, files }))
  } catch {
    // Private windows and full quotas simply skip persistence.
  }
}

function sameFiles(a: SourceFiles, b: SourceFiles) {
  return fileNames.every((file) => a[file] === b[file])
}

/** Keep still-valid choices across rebuilds; otherwise use each axis default. */
function reconcile(
  axes: readonly Axis[],
  previous: Record<string, VariantValue>,
): Record<string, VariantValue> {
  const next: Record<string, VariantValue> = {}
  for (const axis of axes) {
    const kept = previous[axis.name]
    if (kept !== undefined && axis.values.includes(kept)) next[axis.name] = kept
    else if (axis.fallback !== undefined) next[axis.name] = axis.fallback
  }
  return next
}

type Level = LanguageProblem['severity']

/** The most serious severity present, or undefined for none. */
function worst(problems: readonly LanguageProblem[]): Level | undefined {
  if (problems.some((problem) => problem.severity === 'error')) return 'error'
  if (problems.some((problem) => problem.severity === 'warning'))
    return 'warning'
  return problems.length ? 'info' : undefined
}

function countLabel(count: number) {
  return count === 1 ? '1 problem' : `${count} problems`
}

function TabBadge({ problems }: { problems: readonly LanguageProblem[] }) {
  const s = useStyles(playgroundEditorStyles, {
    level: worst(problems) ?? 'none',
  })
  if (!problems.length) return null
  return (
    <span {...s.TabBadge} title={countLabel(problems.length)}>
      {problems.length}
      <span {...s.SrOnly}>
        {problems.length === 1 ? ' problem' : ' problems'}
      </span>
    </span>
  )
}

function ProblemRow({
  problem,
  onReveal,
}: {
  problem: LanguageProblem
  onReveal: (problem: LanguageProblem) => void
}) {
  const s = useStyles(playgroundEditorStyles, { level: problem.severity })
  return (
    <li>
      <button
        type="button"
        {...s.ProblemRow}
        title={problem.message}
        onClick={() => onReveal(problem)}
      >
        <span {...s.ProblemSource}>{problem.source}</span>
        <span {...s.ProblemLocation}>
          {problem.file}:{problem.line}:{problem.column}
        </span>
        <span {...s.ProblemText}>
          <span {...s.SrOnly}>{problem.severity}: </span>
          {problem.message.split('\n')[0]}
        </span>
      </button>
    </li>
  )
}

function ProblemsButton({
  label,
  level,
  expanded,
  disabled,
  title,
  checkMs,
  readyMs,
  onToggle,
}: {
  label: string
  level: Level | 'clean' | 'none'
  expanded: boolean
  disabled: boolean
  title: string
  checkMs?: number
  readyMs?: number
  onToggle: () => void
}) {
  const s = useStyles(playgroundEditorStyles, { level })
  return (
    <button
      type="button"
      {...s.ProblemsButton}
      id="playground-problems-toggle"
      aria-expanded={expanded}
      aria-controls="playground-problems"
      aria-disabled={disabled}
      title={title}
      data-check-ms={checkMs === undefined ? undefined : Math.round(checkMs)}
      data-ready-ms={readyMs === undefined ? undefined : Math.round(readyMs)}
      onClick={disabled ? undefined : onToggle}
    >
      <span {...s.ProblemsDot} aria-hidden="true" />
      {label}
    </button>
  )
}

function Counts({ text }: { text: string }) {
  const over = text.length > MAX_FILE_CHARS
  const s = useStyles(playgroundEditorStyles, {
    level: over ? 'error' : 'none',
  })
  return (
    <span {...s.Counts}>
      {text.split('\n').length} lines · {text.length.toLocaleString('en-GB')} /{' '}
      {MAX_FILE_CHARS.toLocaleString('en-GB')}
      {over ? ' · over the limit' : ''}
    </span>
  )
}

function TabButton({
  active,
  children,
  controls,
  title,
  onSelect,
  onKeyDown,
  id,
}: {
  active: boolean
  children: ReactNode
  controls: string
  title?: string
  onSelect: () => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  id: string
}) {
  const s = useStyles(playgroundEditorStyles, { active })
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      title={title}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      {...s.Tab}
    >
      {children}
    </button>
  )
}

/** A file tab's content: the layer the file is, above its name. */
function FileLabel({
  file,
  active,
  problems,
}: {
  file: FileName
  active: boolean
  problems: readonly LanguageProblem[]
}) {
  const s = useStyles(playgroundEditorStyles, { active })
  return (
    <span {...s.FileLabel}>
      <span {...s.FileLayer}>{fileLayers[file].label}</span>
      <span {...s.FileName}>
        {file}
        <TabBadge problems={problems} />
      </span>
    </span>
  )
}

function StatusPill({ status }: { status: Status }) {
  const s = useStyles(playgroundEditorStyles, { status: status.kind })
  return (
    <span {...s.Pill} role="status" aria-live="polite">
      <span {...s.Dot} aria-hidden="true" />
      {status.kind === 'ok'
        ? `Compiled in ${Math.max(1, Math.round(status.ms))}ms`
        : status.label}
    </span>
  )
}

/** Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects. */
function arrowNavigate<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
) {
  const index = ids.indexOf(current)
  const next =
    event.key === 'ArrowRight'
      ? ids[(index + 1) % ids.length]
      : event.key === 'ArrowLeft'
        ? ids[(index - 1 + ids.length) % ids.length]
        : event.key === 'Home'
          ? ids[0]
          : event.key === 'End'
            ? ids[ids.length - 1]
            : undefined
  if (next === undefined) return
  event.preventDefault()
  select(next)
  const list = event.currentTarget.parentElement
  requestAnimationFrame(() =>
    list?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
  )
}

function VariantControls({
  axes,
  selection,
  onChange,
}: {
  axes: readonly Axis[]
  selection: Record<string, VariantValue>
  onChange: (axis: string, value: VariantValue | undefined) => void
}) {
  const s = useStyles(playgroundEditorStyles)
  return (
    <div {...s.Controls}>
      <span {...s.ControlsLabel}>Variants</span>
      {axes.length ? (
        axes.map((axis) => {
          const booleanAxis = axis.values.every(
            (value) => typeof value === 'boolean',
          )
          if (booleanAxis)
            return (
              <label key={axis.name} {...s.Control}>
                <input
                  type="checkbox"
                  {...s.Checkbox}
                  checked={selection[axis.name] === true}
                  onChange={(event) =>
                    onChange(axis.name, event.target.checked)
                  }
                />
                {axis.name}
              </label>
            )
          const current = selection[axis.name]
          return (
            <label key={axis.name} {...s.Control}>
              {axis.name}
              <select
                {...s.SmallSelect}
                aria-label={axis.name}
                value={current === undefined ? '' : String(current)}
                onChange={(event) =>
                  onChange(
                    axis.name,
                    axis.values.find(
                      (value) => String(value) === event.target.value,
                    ),
                  )
                }
              >
                {axis.fallback === undefined ? (
                  <option value="">unset</option>
                ) : null}
                {axis.values.map((value) => (
                  <option key={String(value)} value={String(value)}>
                    {String(value)}
                  </option>
                ))}
              </select>
            </label>
          )
        })
      ) : (
        <span {...s.Note}>
          No variant axes on the exported stylesheets, so the component owns its
          own state.
        </span>
      )}
    </div>
  )
}

export function PlaygroundEditor() {
  const s = useStyles(playgroundEditorStyles)
  const [presetId, setPresetId] = useState(defaultPreset.id)
  const [files, setFiles] = useState<SourceFiles>(defaultPreset.files)
  const [activeFile, setActiveFile] = useState<FileName>('styles.ts')
  const [tab, setTab] = useState<InspectorTab>('preview')
  const [split, setSplit] = useState(55)
  const [frame, setFrame] = useState<Frame>('fill')
  const [status, setStatus] = useState<Status>({
    kind: 'loading',
    label: 'Loading compiler…',
  })
  const [result, setResult] = useState<Compiled | null>(null)
  const [stable, setStable] = useState<Compiled | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [renderProblem, setRenderProblem] = useState<Problem | null>(null)
  const [output, setOutput] = useState<Partial<SourceFiles>>({})
  const [selection, setSelection] = useState<Record<string, VariantValue>>({})
  const [copied, setCopied] = useState(false)
  const [restored, setRestored] = useState(false)
  // Bumped whenever `files` is replaced by text the editor did not type.
  const [revision, setRevision] = useState(0)
  const [problemsOpen, setProblemsOpen] = useState(false)
  const language = useLanguage(files, restored)
  const editor = useRef<CodeEditorHandle>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const builds = useRef(0)
  const pendingReveal = useRef<{ line: number; column?: number } | null>(null)

  const preset = findPreset(presetId) ?? defaultPreset
  const modified = !sameFiles(files, preset.files)

  // Restore the visitor's own draft after hydration (never from a URL).
  useEffect(() => {
    const draft = readDraft()
    if (draft) {
      setPresetId(draft.preset)
      setFiles(draft.files)
      setRevision((current) => current + 1)
    }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    let cancelled = false
    const first = builds.current === 0
    const timer = window.setTimeout(
      async () => {
        writeDraft(presetId, files)
        const id = ++builds.current
        try {
          const runtime = await import('./runtime.ts')
          if (cancelled) return
          setStatus((current) =>
            current.kind === 'loading'
              ? { kind: 'loading', label: 'Compiling…' }
              : current,
          )
          const outcome = await runtime.compile(files, id)
          if (cancelled) return
          if (outcome.ok) {
            setResult(outcome.result)
            setOutput(outcome.result.output)
            setProblem(null)
            setSelection((previous) => reconcile(outcome.result.axes, previous))
            setStatus({ kind: 'ok', ms: outcome.result.ms })
          } else {
            setProblem(outcome.problem)
            if (outcome.output)
              setOutput((previous) => ({ ...previous, ...outcome.output }))
            setStatus({
              kind: 'error',
              label: problemTitles[outcome.problem.kind],
            })
          }
        } catch (error) {
          if (cancelled) return
          setProblem({
            kind: 'runtime',
            message: `The in-browser compiler failed to load: ${error instanceof Error ? error.message : String(error)}`,
          })
          setStatus({ kind: 'error', label: 'Compiler unavailable' })
        }
      },
      first ? 0 : DEBOUNCE_MS,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [files, presetId, restored])

  const onRendered = useCallback((rendered: Compiled) => {
    setStable(rendered)
    setRenderProblem(null)
  }, [])
  const onRenderError = useCallback((error: Error) => {
    setRenderProblem({
      kind: 'render',
      file: 'App.tsx',
      message: error.message.includes('unregistered')
        ? `${error.message}\nExport every stylesheet your component uses so the playground can build its CSS.`
        : error.message,
    })
  }, [])

  const shownProblem = problem ?? renderProblem
  const pillStatus: Status =
    !problem && renderProblem
      ? { kind: 'error', label: problemTitles.render }
      : status

  useEffect(() => {
    if (!pendingReveal.current) return
    const { line, column } = pendingReveal.current
    pendingReveal.current = null
    editor.current?.reveal(line, column)
  }, [activeFile])

  const reveal = (target: {
    file?: FileName
    line?: number
    column?: number
  }) => {
    if (!target.file || !target.line) return
    if (target.file === activeFile)
      editor.current?.reveal(target.line, target.column)
    else {
      pendingReveal.current = { line: target.line, column: target.column }
      setActiveFile(target.file)
    }
  }

  const choosePreset = (id: string) => {
    const next = findPreset(id)
    if (!next) return
    setPresetId(next.id)
    setFiles(next.files)
    setRevision((current) => current + 1)
    setSelection({})
    setActiveFile('styles.ts')
  }

  const reset = () => {
    setFiles(preset.files)
    setRevision((current) => current + 1)
  }

  const onEdit = useCallback(
    (file: FileName, value: string) =>
      setFiles((current) =>
        current[file] === value ? current : { ...current, [file]: value },
      ),
    [],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(files[activeFile])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  // Resizable split: pointer drag or arrow keys on the separator.
  const onDividerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const rect = workspace.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const move = (moveEvent: globalThis.PointerEvent) => {
      const percent = ((moveEvent.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(75, Math.max(30, percent)))
    }
    const target = event.currentTarget
    const stop = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', stop)
      target.removeEventListener('pointercancel', stop)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', stop)
    target.addEventListener('pointercancel', stop)
  }
  const onDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2
    const next =
      event.key === 'ArrowLeft'
        ? split - step
        : event.key === 'ArrowRight'
          ? split + step
          : event.key === 'Home'
            ? 30
            : event.key === 'End'
              ? 75
              : undefined
    if (next === undefined) return
    event.preventDefault()
    setSplit(Math.min(75, Math.max(30, next)))
  }

  const props = Object.fromEntries(
    Object.entries(selection).filter(([, value]) => value !== undefined),
  )
  const selectionKey = JSON.stringify(props)
  const text = files[activeFile]
  const errorLine =
    problem?.file === activeFile && problem.kind === 'syntax'
      ? problem.line
      : undefined

  const problems = language.check?.problems ?? noProblems
  const level = worst(problems)
  const checking = language.status.kind !== 'failed' && !language.check
  const problemsLabel =
    language.status.kind === 'failed'
      ? 'Type checking unavailable'
      : checking
        ? 'Starting type checker…'
        : problems.length
          ? countLabel(problems.length)
          : 'No problems'
  const problemsTitle =
    language.status.kind === 'failed'
      ? `The language worker failed: ${language.status.message}. The preview still compiles.`
      : language.status.kind === 'ready'
        ? `TypeScript ${language.status.typescript} and the Toned language service check all three files as you type.`
        : 'Loading TypeScript and the Toned language service…'
  const showProblems = problemsOpen && problems.length > 0

  return (
    <main id="main" {...s.Main}>
      <div {...s.Toolbar}>
        <div {...s.ToolbarGroup}>
          <h1 {...s.Title}>Playground</h1>
          <label {...s.SelectLabel}>
            Example
            <select
              {...s.Select}
              aria-label="Example"
              value={presetId}
              onChange={(event) => choosePreset(event.target.value)}
            >
              {presets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <span {...s.Summary}>
            {modified ? 'Edited · ' : ''}
            {preset.summary}
          </span>
        </div>
        <div {...s.ToolbarGroup}>
          <StatusPill status={pillStatus} />
          <button
            type="button"
            {...s.Button}
            onClick={reset}
            disabled={!modified}
            aria-disabled={!modified}
            title="Restore this example's original code"
          >
            Reset
          </button>
          <button type="button" {...s.Button} onClick={copy}>
            {copied ? 'Copied' : `Copy ${activeFile}`}
          </button>
        </div>
      </div>

      <div
        {...s.Workspace.withProps({
          ref: workspace,
          style: {
            gridTemplateColumns: `minmax(0, ${split}fr) 16px minmax(0, ${100 - split}fr)`,
          },
        })}
      >
        <section {...s.EditorPanel} aria-label="Code editor">
          <div {...s.TabBar}>
            <div {...s.TabList} role="tablist" aria-label="Files">
              {fileNames.map((file) => (
                <TabButton
                  key={file}
                  id={`playground-file-${file}`}
                  active={file === activeFile}
                  controls="playground-editor-panel"
                  title={fileLayers[file].hint}
                  onSelect={() => setActiveFile(file)}
                  onKeyDown={(event) =>
                    arrowNavigate(event, fileNames, activeFile, setActiveFile)
                  }
                >
                  <FileLabel
                    file={file}
                    active={file === activeFile}
                    problems={problems.filter((item) => item.file === file)}
                  />
                </TabButton>
              ))}
            </div>
            <span {...s.TabMeta}>TypeScript · React</span>
          </div>
          <div
            id="playground-editor-panel"
            role="tabpanel"
            aria-labelledby={`playground-file-${activeFile}`}
            {...s.Main}
          >
            <CodeEditor
              ref={editor}
              file={activeFile}
              files={files}
              revision={revision}
              errorLine={errorLine}
              problems={problems}
              client={language.client}
              onChange={onEdit}
            />
          </div>
          {showProblems ? (
            <ul
              id="playground-problems"
              aria-label="Problems"
              {...s.ProblemsPanel}
            >
              {problems.map((item) => (
                <ProblemRow
                  key={`${item.file}:${item.from}:${item.source}:${item.code}`}
                  problem={item}
                  onReveal={reveal}
                />
              ))}
            </ul>
          ) : null}
          <div {...s.StatusBar}>
            <div {...s.StatusGroup}>
              <ProblemsButton
                label={problemsLabel}
                level={checking ? 'none' : (level ?? 'clean')}
                expanded={showProblems}
                disabled={!problems.length}
                title={problemsTitle}
                checkMs={language.check?.ms}
                readyMs={
                  language.status.kind === 'ready'
                    ? language.status.ms
                    : undefined
                }
                onToggle={() => setProblemsOpen((open) => !open)}
              />
              <span id="playground-editor-hint" {...s.Hint}>
                {language.skipped.length
                  ? `${language.skipped.join(', ')} is too large to check · `
                  : ''}
                Tab indents · Esc, then Tab, leaves the editor · Ctrl-Space
                completes
              </span>
            </div>
            <Counts text={text} />
          </div>
        </section>

        <div
          {...s.Divider}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and preview"
          aria-valuemin={30}
          aria-valuemax={75}
          aria-valuenow={Math.round(split)}
          tabIndex={0}
          onPointerDown={onDividerPointerDown}
          onKeyDown={onDividerKeyDown}
        >
          <span {...s.DividerHandle} />
        </div>

        <section {...s.PreviewPanel} aria-label="Output">
          <div {...s.TabBar}>
            <div {...s.TabList} role="tablist" aria-label="Output views">
              {inspectorTabs.map((item) => (
                <TabButton
                  key={item.id}
                  id={`playground-tab-${item.id}`}
                  active={item.id === tab}
                  controls="playground-output-panel"
                  onSelect={() => setTab(item.id)}
                  onKeyDown={(event) =>
                    arrowNavigate(
                      event,
                      inspectorTabs.map((entry) => entry.id),
                      tab,
                      setTab,
                    )
                  }
                >
                  {item.label}
                </TabButton>
              ))}
            </div>
            {tab === 'preview' ? (
              <label {...s.WidthControl}>
                Width
                <select
                  {...s.SmallSelect}
                  aria-label="Preview width"
                  value={frame}
                  onChange={(event) => setFrame(event.target.value as Frame)}
                >
                  {Object.entries(frames).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div
            id="playground-output-panel"
            role="tabpanel"
            aria-labelledby={`playground-tab-${tab}`}
            {...s.Main}
          >
            {tab === 'preview' ? (
              <>
                {result ? (
                  <VariantControls
                    axes={result.axes}
                    selection={selection}
                    onChange={(axis, value) =>
                      setSelection((current) => {
                        const next = { ...current }
                        if (value === undefined) delete next[axis]
                        else next[axis] = value
                        return next
                      })
                    }
                  />
                ) : null}
                <div {...s.Stage}>
                  <div
                    {...(frame === 'fill'
                      ? s.Frame
                      : s.FramedBox.withProps({
                          style: { maxWidth: `${frame}px` },
                        }))}
                  >
                    {result ? (
                      <PreviewStage
                        result={result}
                        stable={stable}
                        props={props}
                        selectionKey={selectionKey}
                        onRendered={onRendered}
                        onRenderError={onRenderError}
                      />
                    ) : (
                      <p {...s.Placeholder}>
                        {problem
                          ? 'Fix the error to see the preview.'
                          : 'Starting the in-browser compiler…'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
            {tab === 'resolved' ? (
              result ? (
                <ResolvedStyles result={result} selection={props} />
              ) : (
                <p {...s.Empty}>Nothing has compiled yet.</p>
              )
            ) : null}
            {tab === 'compiled' ? <CompiledOutput output={output} /> : null}
            {tab === 'css' ? (
              result ? (
                <GeneratedCss result={result} />
              ) : (
                <p {...s.Empty}>Nothing has compiled yet.</p>
              )
            ) : null}
          </div>

          {shownProblem ? (
            <div {...s.Problem} role="alert">
              <div {...s.ProblemHead}>
                {problemTitles[shownProblem.kind]}
                {shownProblem.file ? (
                  shownProblem.line ? (
                    <button
                      type="button"
                      {...s.ProblemLink}
                      onClick={() => reveal(shownProblem)}
                    >
                      {shownProblem.file}:{shownProblem.line}:
                      {shownProblem.column ?? 1}
                    </button>
                  ) : (
                    <span>in {shownProblem.file}</span>
                  )
                ) : null}
              </div>
              <pre {...s.ProblemMessage}>{shownProblem.message}</pre>
              {result || stable ? (
                <span {...s.ProblemNote}>
                  The preview shows the last version that worked.
                </span>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
