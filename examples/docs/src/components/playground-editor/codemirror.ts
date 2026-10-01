/**
 * The playground's CodeMirror 6 editor. Loaded from an effect, so neither
 * CodeMirror nor anything here is part of the server render; the static
 * highlighted code in `CodeEditor.tsx` holds the same box until this mounts.
 */
import {
  acceptCompletion,
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  closeBrackets,
  closeBracketsKeymap,
  completionStatus,
  insertCompletionText,
  pickedCompletion,
} from '@codemirror/autocomplete'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
} from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { type Diagnostic, linter, setDiagnostics } from '@codemirror/lint'
import {
  EditorState,
  type Extension,
  RangeSet,
  StateEffect,
  StateField,
} from '@codemirror/state'
import {
  type Command,
  Decoration,
  EditorView,
  GutterMarker,
  gutterLineClass,
  hoverTooltip,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { codeColors } from '../../highlight.ts'
import { brand, fonts } from '../../styles/brand.ts'
import { editorMetrics } from '../../styles/playground-editor.ts'
import type { LanguageClient } from './language/client.ts'
import type {
  CompletionEntry,
  LanguageProblem,
  SymbolDetails,
  TonedDetails,
} from './language/protocol.ts'
import type { FileName, SourceFiles } from './types.ts'

const INDENT = '  '

/** The same colours as the docs' Shiki theme (`toned-light`). */
const highlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: codeColors.comment, fontStyle: 'italic' },
  {
    tag: [
      tags.keyword,
      tags.modifier,
      tags.operatorKeyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: codeColors.keyword,
  },
  {
    tag: [tags.string, tags.special(tags.string), tags.regexp],
    color: codeColors.string,
  },
  {
    tag: [tags.number, tags.bool, tags.null, tags.atom],
    color: codeColors.constant,
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.function(tags.definition(tags.variableName)),
    ],
    color: codeColors.function,
  },
  {
    tag: [tags.typeName, tags.className, tags.namespace],
    color: codeColors.type,
  },
  { tag: tags.tagName, color: codeColors.tag },
  { tag: tags.attributeName, color: codeColors.attribute },
  {
    tag: [tags.operator, tags.punctuation, tags.bracket, tags.separator],
    color: codeColors.punctuation,
  },
])

const popup = {
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: '10px',
  boxShadow: '0 1px 2px #17234b14, 0 12px 32px #17234b24',
  color: brand.body,
}

/** CodeMirror's own internals, in the site's palette and the old metrics. */
const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: brand.codeBg,
    color: brand.codeInk,
    fontSize: `${editorMetrics.fontSize}px`,
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: fonts.mono,
    lineHeight: `${editorMetrics.lineHeight}px`,
    fontVariantLigatures: 'none',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: `${editorMetrics.paddingY}px 0`,
    caretColor: brand.ink,
  },
  '.cm-line': { padding: `0 ${editorMetrics.paddingX}px` },
  '.cm-content ::selection': { backgroundColor: '#284bdd33' },
  '.cm-gutters': {
    backgroundColor: brand.codeBg,
    color: brand.faint,
    border: 'none',
    borderRight: `1px solid ${brand.divider}`,
  },
  '.cm-lineNumbers .cm-gutterElement': {
    boxSizing: 'border-box',
    minWidth: '47px',
    padding: '0 10px',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: '#284bdd1f',
    outline: '1px solid #284bdd40',
  },
  '.cm-preview-error': {
    backgroundColor: brand.dangerSoft,
    boxShadow: `inset 3px 0 0 ${brand.danger}`,
  },
  '.cm-gutterElement.cm-preview-error-number': {
    color: brand.danger,
    fontWeight: '700',
  },

  // Tooltips: completion list, hover cards and lint messages.
  '.cm-tooltip': { ...popup, zIndex: '400' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: fonts.mono,
    fontSize: '12px',
    maxHeight: '15em',
    minWidth: '220px',
    maxWidth: 'min(460px, calc(100vw - 32px))',
    padding: '4px',
    borderRadius: '10px',
  },
  '.cm-tooltip-lint': { borderRadius: '10px', overflow: 'hidden' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '3px 8px',
    borderRadius: '6px',
    lineHeight: '20px',
    color: brand.codeInk,
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: brand.blueSoft,
    color: brand.ink,
  },
  '.cm-completionLabel': {
    flexShrink: '0',
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
    color: brand.blue,
    fontWeight: '700',
  },
  '.cm-completionDetail': {
    marginLeft: 'auto',
    paddingLeft: '12px',
    fontFamily: fonts.sans,
    fontStyle: 'normal',
    fontSize: '11px',
    color: brand.faint,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-completionIcon': {
    width: '16px',
    padding: '0',
    opacity: '1',
    fontSize: '11px',
    fontFamily: fonts.sans,
    fontWeight: '700',
    textAlign: 'center',
    color: brand.faint,
    flexShrink: '0',
  },
  '.cm-completionIcon-function, .cm-completionIcon-method': {
    color: codeColors.function,
  },
  '.cm-completionIcon-property, .cm-completionIcon-enum': {
    color: codeColors.attribute,
  },
  '.cm-completionIcon-text': { color: codeColors.string },
  '.cm-completionIcon-keyword': { color: codeColors.keyword },
  '.cm-completionIcon-type, .cm-completionIcon-interface, .cm-completionIcon-class':
    { color: codeColors.type },
  '.cm-tn-origin': {
    fontFamily: fonts.sans,
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    lineHeight: '16px',
    padding: '0 5px',
    borderRadius: '4px',
    color: brand.blue,
    backgroundColor: brand.blueSoft,
    flexShrink: '0',
  },
  'li[aria-selected] .cm-tn-origin': { backgroundColor: brand.surface },
  '.cm-tooltip.cm-completionInfo': {
    ...popup,
    padding: '0',
    maxWidth: 'min(420px, calc(100vw - 32px))',
    maxHeight: '280px',
    overflow: 'auto',
  },
  '.cm-completionInfo.cm-completionInfo-right': { marginLeft: '6px' },
  '.cm-completionInfo.cm-completionInfo-left': { marginRight: '6px' },
  // On a phone the details card would cover the list it describes.
  '@media (max-width: 640px)': {
    '.cm-tooltip.cm-completionInfo': { display: 'none' },
  },
  '.cm-tooltip-hover': {
    maxWidth: 'min(520px, calc(100vw - 32px))',
    maxHeight: '320px',
    overflow: 'auto',
  },
  '.cm-tooltip-section:not(:first-child)': {
    borderTop: `1px solid ${brand.divider}`,
  },
  '.cm-tn-info': {
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '18px',
  },
  '.cm-tn-section': { padding: '10px 12px' },
  '.cm-tn-section + .cm-tn-section': {
    borderTop: `1px solid ${brand.divider}`,
  },
  '.cm-tn-toned': { backgroundColor: brand.blueTint },
  '.cm-tn-source': {
    display: 'block',
    marginBottom: '4px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: brand.faint,
  },
  '.cm-tn-toned .cm-tn-source': { color: brand.blue },
  '.cm-tn-code': {
    margin: '0',
    fontFamily: fonts.mono,
    fontSize: '12px',
    lineHeight: '18px',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    color: brand.codeInk,
  },
  '.cm-tn-docs': {
    margin: '6px 0 0',
    whiteSpace: 'pre-wrap',
    color: brand.body,
  },
  '.cm-tn-title': {
    fontFamily: fonts.mono,
    fontWeight: '600',
    color: brand.ink,
    overflowWrap: 'anywhere',
  },
  '.cm-tn-facts': {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    gap: '2px 10px',
    margin: '6px 0 0',
  },
  '.cm-tn-facts dt': { color: brand.muted, fontWeight: '600' },
  '.cm-tn-facts dd': {
    margin: '0',
    fontFamily: fonts.mono,
    fontSize: '11.5px',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    color: brand.codeInk,
  },

  '.cm-diagnostic': {
    padding: '8px 12px',
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '18px',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    color: brand.ink,
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
  },
  '.cm-diagnostic-error': { borderLeftColor: brand.danger },
  '.cm-diagnostic-warning': { borderLeftColor: '#b4531c' },
  '.cm-diagnostic-info': { borderLeftColor: brand.blue },
  '.cm-diagnosticSource': {
    marginTop: '2px',
    fontSize: '11px',
    fontWeight: '600',
    color: brand.muted,
    opacity: '1',
  },
})

function element(tag: string, className: string, text?: string) {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Inferred stylesheet types run to hundreds of lines; show the head. */
function clamp(signature: string) {
  const lines = signature.split('\n')
  const head = lines.slice(0, 12).join('\n')
  const text = head.length > 900 ? `${head.slice(0, 900)}…` : head
  return lines.length > 12
    ? `${text}\n  … ${lines.length - 12} more lines`
    : text
}

/** One card for both services: the TypeScript type, then Toned's design data. */
function renderInfo(
  ts: SymbolDetails | undefined,
  toned: TonedDetails | undefined,
) {
  const root = element('div', 'cm-tn-info')
  if (ts) {
    const section = element('div', 'cm-tn-section')
    section.append(
      element('span', 'cm-tn-source', 'TypeScript'),
      element('pre', 'cm-tn-code', clamp(ts.signature)),
    )
    const docs = [
      ts.docs,
      ...(ts.tags ?? []).map((tag) => `@${tag.name} ${tag.text}`.trim()),
    ]
      .filter(Boolean)
      .join('\n')
    if (docs) section.append(element('p', 'cm-tn-docs', docs))
    root.append(section)
  }
  if (toned) {
    const section = element('div', 'cm-tn-section cm-tn-toned')
    section.append(element('span', 'cm-tn-source', 'Toned language service'))
    if (toned.title) section.append(element('div', 'cm-tn-title', toned.title))
    if (toned.facts.length) {
      const facts = element('dl', 'cm-tn-facts')
      for (const fact of toned.facts)
        facts.append(
          element('dt', '', fact.label),
          element('dd', '', fact.value),
        )
      section.append(facts)
    }
    root.append(section)
  }
  return root
}

/** Completions that Toned's index supplied or annotated. */
const tonedLabels = new WeakSet<Completion>()

const setErrorLine = StateEffect.define<number | undefined>()
const errorLineDecoration = Decoration.line({ class: 'cm-preview-error' })
const errorNumber = new (class extends GutterMarker {
  elementClass = 'cm-preview-error-number'
})()

/** The line the preview's own compile failed on (1-based), if any. */
const errorLine = StateField.define<number | undefined>({
  create: () => undefined,
  update(value, transaction) {
    for (const effect of transaction.effects)
      if (effect.is(setErrorLine)) return effect.value
    return value
  },
  provide: (field) => [
    EditorView.decorations.from(field, (line) => (view) => {
      if (!line || line > view.state.doc.lines) return Decoration.none
      return Decoration.set([
        errorLineDecoration.range(view.state.doc.line(line).from),
      ])
    }),
    gutterLineClass.compute([field], (state) => {
      const line = state.field(field)
      if (!line || line > state.doc.lines) return RangeSet.empty
      return RangeSet.of([errorNumber.range(state.doc.line(line).from)])
    }),
  ],
})

/** Tab indents; with no selection it inserts one indent step at the caret. */
const insertIndent: Command = (view) => {
  if (view.state.selection.ranges.some((range) => !range.empty))
    return indentMore(view)
  view.dispatch(
    view.state.update(view.state.replaceSelection(INDENT), {
      scrollIntoView: true,
      userEvent: 'input',
    }),
  )
  return true
}

export type EditorController = {
  /** Replace both files with text the editor did not produce (new history). */
  load(files: SourceFiles): void
  /** Switch the visible file, keeping each file's own undo history. */
  show(file: FileName): void
  /** All current problems; the visible file's are drawn as squiggles. */
  setProblems(problems: readonly LanguageProblem[]): void
  setErrorLine(line: number | undefined): void
  /** Focus the editor with the caret at a 1-based line and column. */
  reveal(line: number, column?: number): void
  destroy(): void
}

export function createEditor(options: {
  parent: HTMLElement
  file: FileName
  files: SourceFiles
  label: (file: FileName) => string
  describedBy: string
  onChange: (file: FileName, text: string) => void
  client: () => LanguageClient | null
}): EditorController {
  const states = new Map<FileName, EditorState>()
  let sources = options.files
  let current = options.file
  let problems: readonly LanguageProblem[] = []
  let failedLine: number | undefined

  function toCompletion(
    file: FileName,
    entry: CompletionEntry,
    result: { to: number },
  ): Completion {
    const text = entry.insert ?? entry.label
    const completion: Completion = {
      label: entry.label,
      type: entry.kind,
      boost: entry.boost,
      ...(entry.detail ? { detail: entry.detail } : {}),
      ...(entry.insert || entry.range
        ? {
            apply: (view, completion, from, to) => {
              // Offsets were taken when the list opened; the end has moved by
              // however much has been typed since.
              const range = entry.range
                ? {
                    from: entry.range.from,
                    to: Math.max(to, entry.range.to + (to - result.to)),
                  }
                : { from, to }
              view.dispatch({
                ...insertCompletionText(view.state, text, range.from, range.to),
                annotations: pickedCompletion.of(completion),
              })
            },
          }
        : {}),
      info: async () => {
        const toned: TonedDetails | undefined =
          entry.origin === 'ts'
            ? undefined
            : {
                title: `${entry.label} · ${entry.detail ?? 'token'}`,
                facts: entry.tonedInfo
                  ? [{ label: 'Index', value: entry.tonedInfo }]
                  : [],
              }
        const details = entry.ts
          ? await options.client()?.request({
              kind: 'completionDetails',
              file,
              position: view.state.selection.main.head,
              entry: entry.ts,
            })
          : undefined
        // A literal's "type" is just its own text: nothing worth a card.
        const symbol =
          details && details.signature !== entry.label ? details : undefined
        if (!symbol && !toned) return null
        return renderInfo(symbol, toned)
      },
    }
    if (entry.origin !== 'ts') tonedLabels.add(completion)
    return completion
  }

  function completionSource(file: FileName) {
    return async (
      context: CompletionContext,
    ): Promise<CompletionResult | null> => {
      const client = options.client()
      if (!client) return null
      const typed = context.state.sliceDoc(
        Math.max(0, context.pos - 1),
        context.pos,
      )
      if (!context.explicit) {
        if (!/[\w$.'"`]/.test(typed)) return null
        // Typing a number is not asking for names that contain its digits.
        if (context.matchBefore(/(?<![\w$])\d[\w.]*/)) return null
      }
      if (!client.update(file, context.state.doc.toString())) return null
      const result = await client.request({
        kind: 'completions',
        file,
        position: context.pos,
        ...(context.explicit || !/[.'"`]/.test(typed)
          ? {}
          : { trigger: typed }),
      })
      if (!result || context.aborted) return null
      return {
        from: result.from,
        to: result.to,
        options: result.entries.map((entry) =>
          toCompletion(file, entry, result),
        ),
        validFor: result.inString ? /^[^'"`\n]*$/ : /^[\w$]*$/,
      }
    }
  }

  function hoverSource(file: FileName) {
    return hoverTooltip(
      async (view, position) => {
        const client = options.client()
        if (!client?.update(file, view.state.doc.toString())) return null
        const result = await client.request({ kind: 'hover', file, position })
        if (!result || (!result.ts && !result.toned)) return null
        const length = view.state.doc.length
        return {
          pos: Math.min(result.from, length),
          end: Math.min(result.to, length),
          above: true,
          create: () => ({ dom: renderInfo(result.ts, result.toned) }),
        }
      },
      { hoverTime: 350 },
    )
  }

  function createState(file: FileName, text: string) {
    const extensions: Extension[] = [
      lineNumbers(),
      history(),
      EditorState.tabSize.of(2),
      indentUnit.of(INDENT),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      javascript({ typescript: true, jsx: true }),
      syntaxHighlighting(highlightStyle),
      autocompletion({
        override: [completionSource(file)],
        activateOnTypingDelay: 60,
        maxRenderedOptions: 80,
        addToOptions: [
          {
            // Mark what Toned's own index contributed.
            render: (completion) =>
              tonedLabels.has(completion)
                ? element('span', 'cm-tn-origin', 'TONED')
                : null,
            position: 90,
          },
        ],
      }),
      // Configured before the hover source, so a problem's message leads
      // the hover card and the symbol's details follow it.
      linter(null),
      hoverSource(file),
      errorLine,
      keymap.of([
        {
          key: 'Tab',
          run: (view) =>
            completionStatus(view.state) === 'active'
              ? acceptCompletion(view)
              : insertIndent(view),
          shift: indentLess,
        },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      EditorView.contentAttributes.of({
        'aria-label': options.label(file),
        'aria-describedby': options.describedBy,
        spellcheck: 'false',
        autocapitalize: 'off',
        autocorrect: 'off',
        'data-gramm': 'false',
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged)
          options.onChange(file, update.state.doc.toString())
      }),
      theme,
    ]
    return EditorState.create({ doc: text, extensions })
  }

  function drawProblems() {
    const length = view.state.doc.length
    const diagnostics: Diagnostic[] = problems
      .filter((problem) => problem.file === current)
      .map((problem) => {
        const from = Math.min(problem.from, length)
        return {
          from,
          to: Math.min(Math.max(problem.to, from), length),
          severity: problem.severity,
          message: problem.message,
          source: `${problem.source === 'ts' ? 'TypeScript' : 'Toned language service'} · ${problem.code}`,
        }
      })
    view.dispatch(setDiagnostics(view.state, diagnostics))
  }

  function decorate() {
    drawProblems()
    if (failedLine !== undefined)
      view.dispatch({ effects: setErrorLine.of(failedLine) })
  }

  states.set(current, createState(current, sources[current]))
  const view = new EditorView({
    state: states.get(current) as EditorState,
    parent: options.parent,
  })

  return {
    load(files) {
      sources = files
      states.clear()
      const next = createState(current, files[current])
      states.set(current, next)
      view.setState(next)
      decorate()
    },
    show(file) {
      if (file === current) return
      states.set(current, view.state)
      current = file
      const next = states.get(file) ?? createState(file, sources[file])
      states.set(file, next)
      view.setState(next)
      decorate()
    },
    setProblems(next) {
      problems = next
      drawProblems()
    },
    setErrorLine(line) {
      if (line === failedLine) return
      failedLine = line
      view.dispatch({ effects: setErrorLine.of(line) })
    },
    reveal(line, column = 1) {
      const { doc } = view.state
      const target = doc.line(Math.min(Math.max(1, line), doc.lines))
      const position = Math.min(
        target.from + Math.max(0, column - 1),
        target.to,
      )
      view.dispatch({
        selection: { anchor: position },
        effects: EditorView.scrollIntoView(position, { y: 'center' }),
      })
      view.focus()
    },
    destroy() {
      view.destroy()
    },
  }
}
