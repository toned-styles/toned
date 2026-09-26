export { createHttpInspectorTransport } from './http.ts'

import type {
  DesignChange,
  DesignDocument,
  DesignKind,
  DesignNode,
  DesignPage,
  DesignValue,
} from '../model.ts'

export interface InspectorSelection {
  readonly uri: string
  readonly owner: string
  readonly part?: string
}
export interface InspectorTransport {
  query(
    input: {
      readonly kind?: DesignKind
      readonly name?: string
      readonly uri?: string
      readonly owner?: string
      readonly offset?: number
      readonly limit: number
    },
    signal: AbortSignal,
  ): Promise<DesignPage<DesignNode>>
  document(uri: string, signal: AbortSignal): Promise<DesignDocument>
  /** Resolve a lexical name, including indexed relative import aliases. */
  definition?(
    input: { readonly uri: string; readonly name: string },
    signal: AbortSignal,
  ): Promise<DesignNode | null>
  propose(
    input: {
      readonly nodeId: string
      readonly value: DesignValue
      readonly scope: {
        readonly uri: string
        readonly owner: string
        readonly path: readonly string[]
      }
      readonly expectedVersion: number
    },
    signal: AbortSignal,
  ): Promise<DesignChange>
  /** Must atomically check edit.version/revision/before and preserve source on error. */
  apply(change: DesignChange, signal: AbortSignal): Promise<DesignDocument>
}
export interface DesignInspector {
  select(selection: InspectorSelection): Promise<void>
  refresh(): Promise<void>
  dispose(): void
}

/** Optional browser-only source inspector. Runtime imports contain no compiler,
 * TypeScript, filesystem or React code; transports own authority and persistence. */
export function mountDesignInspector(
  container: HTMLElement,
  options: {
    readonly transport: InspectorTransport
    readonly selection?: InspectorSelection
    readonly pageSize?: number
  },
): DesignInspector {
  const limit = options.pageSize ?? 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw new Error('Toned inspector: pageSize must be 1..500')
  const document = container.ownerDocument
  const root = document.createElement('section')
  root.setAttribute('aria-label', 'Toned source inspector')
  root.dataset['tonedInspector'] = ''
  root.style.cssText =
    'font:14px/1.5 system-ui,sans-serif;padding:16px;border:1px solid #888;max-width:720px;background:#fff;color:#111;'
  const title = document.createElement('h2')
  title.textContent = 'Toned source inspector'
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const sheets = document.createElement('select')
  sheets.setAttribute('aria-label', 'Stylesheet')
  const refreshButton = document.createElement('button')
  refreshButton.textContent = 'Refresh'
  const previousButton = document.createElement('button')
  previousButton.textContent = 'Previous declarations'
  const nextButton = document.createElement('button')
  nextButton.textContent = 'Next declarations'
  const pageLabel = document.createElement('p')
  const nodes = document.createElement('div')
  nodes.setAttribute('aria-label', 'Declarations')
  const details = document.createElement('div')
  details.setAttribute('aria-label', 'Selected declaration')
  const toolbar = document.createElement('div')
  toolbar.append(sheets, refreshButton)
  root.append(
    title,
    toolbar,
    status,
    pageLabel,
    nodes,
    previousButton,
    nextButton,
    details,
  )
  container.append(root)
  let disposed = false,
    generation = 0,
    controller: AbortController | undefined
  let selection = options.selection,
    offset = 0,
    next: number | undefined
  let sheetPage: readonly DesignNode[] = []
  let selectedNode: DesignNode | undefined,
    sourceDocument: DesignDocument | undefined,
    proposal: DesignChange | undefined
  const listeners: (() => void)[] = []
  const on = (element: HTMLElement, event: string, handler: () => void) => {
    element.addEventListener(event, handler)
    listeners.push(() => element.removeEventListener(event, handler))
  }
  const option = (label: string, value: string) => {
    const element = document.createElement('option')
    element.textContent = label
    element.value = value
    return element
  }
  const text = (tag: string, content: string) => {
    const element = document.createElement(tag)
    element.textContent = content
    return element
  }
  const clearDetail = () => {
    selectedNode = undefined
    sourceDocument = undefined
    proposal = undefined
    details.replaceChildren()
  }
  const begin = () => {
    controller?.abort()
    controller = new AbortController()
    const id = ++generation
    return {
      signal: controller.signal,
      current: () => !disposed && id === generation,
    }
  }
  const error = (value: unknown) => {
    status.textContent = value instanceof Error ? value.message : String(value)
  }

  const showNode = async (node: DesignNode) => {
    if (disposed || !selection) return
    const task = begin()
    clearDetail()
    selectedNode = node
    status.textContent = 'Loading source…'
    try {
      const source = await options.transport.document(node.uri, task.signal)
      if (!task.current()) return
      sourceDocument = source
      const current = source.nodes.find((entry) => entry.id === node.id)
      if (
        !current ||
        current.expression !== node.expression ||
        current.valueSpan?.start !== node.valueSpan?.start ||
        current.valueSpan?.end !== node.valueSpan?.end
      )
        throw new Error(
          'Source changed; refresh the declaration list before editing',
        )
      details.append(
        text('h3', `${node.owner} · ${node.path.join(' → ')}`),
        text(
          'p',
          `Source: ${node.uri} · version ${source.version} · offsets ${node.span.start}–${node.span.end}`,
        ),
      )
      const declaration = text(
        'pre',
        source.text.slice(node.span.start, node.span.end),
      )
      declaration.style.whiteSpace = 'pre-wrap'
      details.append(declaration)
      if (node.description) details.append(text('p', node.description))
      if (node.opaque || !node.valueSpan) {
        details.append(
          text('p', node.opaque ?? 'This node has no directly editable value.'),
        )
        status.textContent =
          'Inspecting source; this expression cannot be edited as a literal.'
        return
      }
      let values = node.values
      const sheet = source.nodes.find(
        (entry) => entry.kind === 'sheet' && entry.owner === node.owner,
      )
      if (!values && sheet?.system) {
        const system = options.transport.definition
          ? await options.transport.definition(
              { uri: sheet.uri, name: sheet.system },
              task.signal,
            )
          : source.nodes.find(
              (entry) => entry.kind === 'system' && entry.name === sheet.system,
            )
        if (!task.current()) return
        if (system?.kind === 'system') {
          const tokens = await options.transport.query(
            {
              kind: 'token',
              name: node.name,
              uri: system.uri,
              owner: system.owner,
              limit: 2,
            },
            task.signal,
          )
          if (!task.current()) return
          if (tokens.total === 1) values = tokens.items[0]?.values
        }
      }
      const editor = document.createElement('textarea')
      editor.setAttribute('aria-label', 'JSON literal value')
      editor.value = JSON.stringify(node.value, null, 2) ?? ''
      editor.rows = 4
      editor.style.cssText = 'display:block;width:100%;box-sizing:border-box;'
      details.append(editor)
      if (values?.length && values.length <= 500) {
        const choices = document.createElement('select')
        choices.setAttribute('aria-label', 'Declared token values')
        choices.append(option('Choose a declared value', ''))
        values.forEach((value, index) => {
          choices.append(option(JSON.stringify(value), String(index)))
        })
        choices.addEventListener('change', () => {
          if (choices.value !== '') {
            editor.value = JSON.stringify(
              values![Number(choices.value)],
              null,
              2,
            )
            invalidate()
          }
        })
        details.append(choices)
      }
      const propose = document.createElement('button')
      propose.textContent = 'Preview source change'
      const apply = document.createElement('button')
      apply.textContent = 'Apply source change'
      apply.disabled = true
      const preview = document.createElement('div')
      preview.setAttribute('aria-label', 'Proposed source change')
      details.append(propose, apply, preview)
      const invalidate = () => {
        controller?.abort()
        generation++
        proposal = undefined
        preview.replaceChildren()
        apply.disabled = true
        propose.disabled = false
        status.textContent = 'Value changed; preview the source change again.'
      }
      editor.addEventListener('input', invalidate)
      propose.addEventListener('click', async () => {
        if (!selectedNode || !sourceDocument || disposed) return
        const work = begin()
        proposal = undefined
        apply.disabled = true
        propose.disabled = true
        preview.replaceChildren()
        status.textContent = 'Checking source change…'
        try {
          if (editor.value.length > 100000)
            throw new Error('Literal exceeds 100,000 character editor budget')
          const value: DesignValue = JSON.parse(editor.value)
          const change = await options.transport.propose(
            {
              nodeId: node.id,
              value,
              scope: {
                uri: node.uri,
                owner: node.owner,
                path: node.path.slice(0, -1),
              },
              expectedVersion: source.version,
            },
            work.signal,
          )
          if (!work.current()) return
          if (
            change.edit.uri !== source.uri ||
            change.edit.version !== source.version ||
            change.edit.revision !== source.revision ||
            change.edit.nodeId !== node.id
          )
            throw new Error(
              'Proposal does not match the selected source version',
            )
          proposal = change
          preview.append(
            text('h4', 'Before'),
            text('pre', change.edit.before),
            text('h4', 'After'),
            text('pre', change.edit.after),
            text(
              'p',
              `Scope: ${node.owner} / ${node.path.slice(0, -1).join(' / ') || '(sheet)'}`,
            ),
            text(
              'p',
              `Impact (${change.impact}): ${change.affected.join(', ')}`,
            ),
          )
          for (const limitation of change.limitations)
            preview.append(text('p', limitation))
          apply.disabled = false
          status.textContent =
            'Review the proposed source change before applying it.'
        } catch (cause) {
          if (work.current()) error(cause)
        } finally {
          if (work.current()) propose.disabled = false
        }
      })
      apply.addEventListener('click', async () => {
        if (!proposal || disposed) return
        const change = proposal,
          work = begin()
        apply.disabled = true
        propose.disabled = true
        status.textContent = 'Applying checked source change…'
        try {
          const current = await options.transport.document(
            change.edit.uri,
            work.signal,
          )
          if (!work.current()) return
          if (
            current.version !== change.edit.version ||
            current.revision !== change.edit.revision ||
            current.text.slice(change.edit.span.start, change.edit.span.end) !==
              change.edit.before
          )
            throw new Error(
              'Source changed; refresh and preview again before applying',
            )
          const updated = await options.transport.apply(change, work.signal)
          if (!work.current()) return
          if (
            updated.uri !== change.edit.uri ||
            updated.version <= change.edit.version
          )
            throw new Error(
              'Apply transport did not return a newer source document',
            )
          proposal = undefined
          await loadDeclarations()
          if (!disposed)
            status.textContent =
              'Source change applied. Validate the updated preview and owning tests.'
        } catch (cause) {
          if (work.current()) {
            proposal = undefined
            error(cause)
          }
        } finally {
          if (work.current()) propose.disabled = false
        }
      })
      status.textContent = 'Inspecting the selected source declaration.'
    } catch (cause) {
      if (task.current()) error(cause)
    }
  }
  const loadDeclarations = async () => {
    if (disposed || !selection) return
    const task = begin()
    clearDetail()
    nodes.replaceChildren()
    status.textContent = 'Loading declarations…'
    try {
      const page = await options.transport.query(
        {
          kind: 'declaration',
          uri: selection.uri,
          owner: selection.owner,
          offset,
          limit,
        },
        task.signal,
      )
      if (!task.current()) return
      next = page.next
      for (const node of page.items) {
        if (selection.part && !node.path.includes(selection.part)) continue
        const button = document.createElement('button')
        button.textContent = node.path.join(' → ')
        button.dataset['nodeId'] = node.id
        button.style.display = 'block'
        button.addEventListener('click', () => {
          void showNode(node)
        })
        nodes.append(button)
      }
      pageLabel.textContent = `${selection.owner}${selection.part ? ` / ${selection.part}` : ''}: declarations ${page.items.length ? offset + 1 : 0}–${offset + page.items.length} of ${page.total}${selection.part ? ' (part filter applies to this page)' : ''}`
      previousButton.disabled = offset === 0
      nextButton.disabled = next === undefined
      status.textContent =
        'Select a declaration to inspect its source and conditions.'
    } catch (cause) {
      if (task.current()) error(cause)
    }
  }
  const refresh = async () => {
    if (disposed) return
    const task = begin()
    clearDetail()
    status.textContent = 'Loading stylesheets…'
    try {
      const page = await options.transport.query(
        { kind: 'sheet', limit },
        task.signal,
      )
      if (!task.current()) return
      sheetPage = page.items
      sheets.replaceChildren()
      for (const [index, sheet] of sheetPage.entries())
        sheets.append(option(`${sheet.name} — ${sheet.uri}`, String(index)))
      if (!selection && sheetPage[0])
        selection = { uri: sheetPage[0].uri, owner: sheetPage[0].owner }
      const index = sheetPage.findIndex(
        (sheet) =>
          sheet.uri === selection?.uri && sheet.owner === selection.owner,
      )
      sheets.value = String(index)
      if (page.next !== undefined)
        title.textContent = `Toned source inspector (${page.items.length} of ${page.total} sheets; select a specific source through the integration)`
      if (selection) await loadDeclarations()
      else status.textContent = 'No indexed stylesheets in this source scope.'
    } catch (cause) {
      if (task.current()) error(cause)
    }
  }
  on(sheets, 'change', () => {
    const sheet = sheetPage[Number(sheets.value)]
    if (sheet) {
      selection = { uri: sheet.uri, owner: sheet.owner }
      offset = 0
      void loadDeclarations()
    }
  })
  on(refreshButton, 'click', () => {
    void refresh()
  })
  on(previousButton, 'click', () => {
    offset = Math.max(0, offset - limit)
    void loadDeclarations()
  })
  on(nextButton, 'click', () => {
    if (next !== undefined) {
      offset = next
      void loadDeclarations()
    }
  })
  void refresh()
  return {
    async select(value) {
      if (disposed) return
      selection = value
      offset = 0
      await refresh()
    },
    refresh,
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      controller?.abort()
      for (const remove of listeners) remove()
      clearDetail()
      nodes.replaceChildren()
      sheetPage = []
      root.remove()
    },
  }
}
