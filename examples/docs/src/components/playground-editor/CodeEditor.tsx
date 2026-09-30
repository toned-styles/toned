import { useStyles } from '@toned/react'
import {
  type KeyboardEvent,
  type Ref,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { highlight } from '../../highlight.ts'
import {
  editorMetrics,
  playgroundEditorStyles,
} from '../../styles/playground-editor.ts'
import { MAX_FILE_CHARS } from './types.ts'

export type CodeEditorHandle = {
  /** Focus the editor with the caret at a 1-based line and column. */
  reveal(line: number, column?: number): void
}

const INDENT = '  '

/** Insert through the browser's editing pipeline so undo/redo keep working. */
function insertText(area: HTMLTextAreaElement, text: string) {
  area.focus()
  if (!document.execCommand?.('insertText', false, text)) {
    area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end')
    area.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function lineStart(value: string, index: number) {
  return value.lastIndexOf('\n', index - 1) + 1
}

/**
 * A textarea over a Shiki-highlighted `<pre>`: the textarea owns editing,
 * selection and IME; the `<pre>` only paints. Both share one set of metrics.
 */
export function CodeEditor({
  value,
  onChange,
  label,
  errorLine,
  ref,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  errorLine?: number
  ref?: Ref<CodeEditorHandle>
}) {
  const s = useStyles(playgroundEditorStyles)
  const area = useRef<HTMLTextAreaElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const gutter = useRef<HTMLDivElement>(null)
  // After Escape, Tab moves focus instead of indenting (no keyboard trap).
  const escaped = useRef(false)

  useImperativeHandle(ref, () => ({
    reveal(line, column = 1) {
      const node = area.current
      if (!node) return
      const lines = node.value.split('\n')
      let offset = 0
      for (let index = 0; index < Math.min(line - 1, lines.length); index++)
        offset += (lines[index]?.length ?? 0) + 1
      offset += Math.max(0, column - 1)
      node.focus()
      node.setSelectionRange(offset, offset)
      const top = (line - 1) * editorMetrics.lineHeight
      if (top < node.scrollTop || top > node.scrollTop + node.clientHeight - 60)
        node.scrollTop = Math.max(0, top - node.clientHeight / 3)
    },
  }))

  const tooLarge = value.length > MAX_FILE_CHARS
  const tokens = useMemo(
    () => (tooLarge ? undefined : highlight(value, 'tsx').tokens),
    [value, tooLarge],
  )
  const lineCount = value.split('\n').length

  const sync = () => {
    const node = area.current
    if (!node) return
    const transform = `translate(${-node.scrollLeft}px, ${-node.scrollTop}px)`
    if (layer.current) layer.current.style.transform = transform
    if (gutter.current)
      gutter.current.style.transform = `translateY(${-node.scrollTop}px)`
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const node = event.currentTarget
    if (event.key === 'Escape') {
      escaped.current = true
      return
    }
    const wasEscaped = escaped.current
    escaped.current = false
    if (event.nativeEvent.isComposing) return
    const { selectionStart: start, selectionEnd: end, value: text } = node

    if (
      event.key === 'Tab' &&
      !wasEscaped &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault()
      const multiline = text.slice(start, end).includes('\n')
      if (!event.shiftKey && !multiline) {
        insertText(node, INDENT)
        return
      }
      // Indent or outdent every line the selection touches.
      const from = lineStart(text, start)
      const toBreak = text.indexOf('\n', end - (end > start ? 1 : 0))
      const to = toBreak === -1 ? text.length : toBreak
      const lines = text.slice(from, to).split('\n')
      const next = lines
        .map((line) =>
          event.shiftKey
            ? line.replace(/^( {1,2}|\t)/, '')
            : line.length
              ? INDENT + line
              : line,
        )
        .join('\n')
      if (next === text.slice(from, to)) return
      const firstDelta =
        (next.split('\n')[0]?.length ?? 0) - (lines[0]?.length ?? 0)
      node.setSelectionRange(from, to)
      insertText(node, next)
      node.setSelectionRange(
        Math.max(from, start + firstDelta),
        end + (next.length - (to - from)),
      )
      return
    }

    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      // Keep the current indentation; step in after an opening bracket.
      const from = lineStart(text, start)
      const indent = /^[ \t]*/.exec(text.slice(from, start))?.[0] ?? ''
      const before = text.slice(from, start).trimEnd()
      const opens = /[{[(]$/.test(before) || /<[\w.]+[^>]*>$/.test(before)
      if (!indent && !opens) return
      event.preventDefault()
      insertText(node, `\n${indent}${opens ? INDENT : ''}`)
    }
  }

  let offset = 0
  return (
    <div {...s.Editor.withProps({ className: 'tnd-playground-editor' })}>
      <div {...s.Gutter} aria-hidden="true">
        <div {...s.GutterLines.withProps({ ref: gutter })}>
          {Array.from({ length: lineCount }, (_, index) => (
            <div
              key={index}
              style={
                index + 1 === errorLine
                  ? { color: '#b3261e', fontWeight: 700 }
                  : undefined
              }
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
      <div {...s.CodeArea}>
        <div aria-hidden="true" {...s.Layer.withProps({ ref: layer })}>
          {errorLine ? (
            <div
              {...s.ErrorBand.withProps({
                style: {
                  top:
                    editorMetrics.paddingY +
                    (errorLine - 1) * editorMetrics.lineHeight,
                },
              })}
            />
          ) : null}
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
            {/* Keeps a trailing empty line as tall as the textarea's. */}
            {'\n '}
          </pre>
        </div>
        <textarea
          {...s.Textarea.withProps<'textarea'>({
            ref: area,
            className: 'tnd-playground-textarea',
          })}
          aria-label={label}
          aria-describedby="playground-editor-hint"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={sync}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          data-gramm="false"
        />
      </div>
    </div>
  )
}
