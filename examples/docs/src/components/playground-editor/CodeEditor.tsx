import { useStyles } from '@toned/react'
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { highlight } from '../../highlight.ts'
import { playgroundEditorStyles } from '../../styles/playground-editor.ts'
import type { EditorController } from './codemirror.ts'
import type { LanguageClient } from './language/client.ts'
import type { LanguageProblem } from './language/protocol.ts'
import { type FileName, MAX_FILE_CHARS, type SourceFiles } from './types.ts'

export type CodeEditorHandle = {
  /** Focus the editor with the caret at a 1-based line and column. */
  reveal(line: number, column?: number): void
}

const HINT_ID = 'playground-editor-hint'

/**
 * The code editor. The server and the first client render paint the code as
 * static Shiki-highlighted text; CodeMirror then mounts over the same box from
 * an effect, with the same metrics and colours, so nothing moves and nothing
 * mismatches during hydration.
 */
export function CodeEditor({
  file,
  files,
  revision,
  onChange,
  errorLine,
  problems,
  client,
  ref,
}: {
  file: FileName
  files: SourceFiles
  /** Changes whenever `files` is replaced by text the editor did not type. */
  revision: number
  onChange: (file: FileName, value: string) => void
  /** The line the preview's compile failed on, in the visible file. */
  errorLine?: number
  problems: readonly LanguageProblem[]
  client: LanguageClient | null
  ref?: Ref<CodeEditorHandle>
}) {
  const s = useStyles(playgroundEditorStyles)
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<EditorController | null>(null)
  const [mounted, setMounted] = useState(false)
  const latest = useRef({ file, files, onChange, client })
  // Editor callbacks read the latest props; the commit updates them before
  // any effect or event can run.
  useLayoutEffect(() => {
    latest.current = { file, files, onChange, client }
  })

  useImperativeHandle(ref, () => ({
    reveal: (line, column) => controller.current?.reveal(line, column),
  }))

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    let cancelled = false
    void import('./codemirror.ts').then(({ createEditor }) => {
      if (cancelled) return
      controller.current = createEditor({
        parent,
        file: latest.current.file,
        files: latest.current.files,
        label: (name) => `${name} source`,
        describedBy: HINT_ID,
        onChange: (name, text) => latest.current.onChange(name, text),
        client: () => latest.current.client,
      })
      setMounted(true)
    })
    return () => {
      cancelled = true
      controller.current?.destroy()
      controller.current = null
      setMounted(false)
    }
  }, [])

  // `revision` is the trigger: it marks text the editor did not produce.
  useEffect(() => {
    if (mounted) controller.current?.load(latest.current.files)
  }, [revision, mounted])
  useEffect(() => {
    if (mounted) controller.current?.show(file)
  }, [file, mounted])
  useEffect(() => {
    if (mounted) controller.current?.setProblems(problems)
  }, [problems, mounted])
  useEffect(() => {
    if (mounted) controller.current?.setErrorLine(errorLine)
  }, [errorLine, mounted])

  const value = files[file]
  const tokens = useMemo(
    () =>
      mounted || value.length > MAX_FILE_CHARS
        ? undefined
        : highlight(value, 'tsx').tokens,
    [value, mounted],
  )
  const lineCount = mounted ? 0 : value.split('\n').length

  let offset = 0
  return (
    <div {...s.Editor.withProps({ className: 'tnd-playground-editor' })}>
      {mounted ? null : (
        <div {...s.StaticCode} aria-hidden="true">
          <div {...s.Gutter}>
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <pre {...s.Highlight}>
            {tokens
              ? tokens.map((line, lineIndex) => {
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
                      {lineIndex < tokens.length - 1 ? '\n' : null}
                    </span>
                  )
                })
              : value}
          </pre>
        </div>
      )}
      <div
        // oxlint-disable-next-line react/refs -- passes the ref object to the prop-bag merger; `.current` is not read during render
        {...s.EditorHost.withProps({ ref: host })}
      />
    </div>
  )
}
