// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { applyDesignEdit, proposeValueEdit } from '../edits.ts'
import { DesignProject } from '../project.ts'
import {
  createHttpInspectorTransport,
  type DesignInspector,
  type InspectorTransport,
  mountDesignInspector,
} from './index.ts'

const uri = 'file:///design/button.ts'
const source = `import { defineSystem, defineToken } from '@toned/core'
const ui = defineSystem({ id: 'inspected', tokens: { padding: defineToken({ values: [0, 1, 2], resolve: value => ({ padding: value }) }) } })
// Preserve this application comment.
export const styles = ui.stylesheet({ Root: { padding: 1, opacity: runtimeOpacity() } })
`
const instances: DesignInspector[] = []
afterEach(() => {
  instances.splice(0).forEach((instance) => {
    instance.dispose()
  })
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})
function setup(extra?: Partial<InspectorTransport>) {
  const project = new DesignProject()
  project.update(uri, source, 1)
  const transport: InspectorTransport = {
    query: async (input) => project.query(input),
    document: async (target) => project.get(target)!,
    propose: async (input) => proposeValueEdit(project, input),
    apply: vi.fn(async (change) => {
      const current = project.get(change.edit.uri)!
      const next = applyDesignEdit(current.text, current.version, change.edit)
      return project.update(current.uri, next, current.version + 1)
    }),
    ...extra,
  }
  const container = document.createElement('div')
  document.body.append(container)
  const inspector = mountDesignInspector(container, { transport })
  instances.push(inspector)
  return { project, transport, container, inspector }
}
const button = (label: string) =>
  [...document.querySelectorAll('button')].find(
    (element) => element.textContent === label,
  )!
const openPadding = async () => {
  await vi.waitFor(() => expect(button('Root → padding')).toBeTruthy())
  button('Root → padding').click()
  await vi.waitFor(() =>
    expect(document.querySelector('textarea')).toBeTruthy(),
  )
}
const preview = async (value: string) => {
  const editor = document.querySelector('textarea')!
  editor.value = value
  editor.dispatchEvent(new Event('input', { bubbles: true }))
  button('Preview source change').click()
  await vi.waitFor(() =>
    expect(button('Apply source change').disabled).toBe(false),
  )
}

test('source edit roundtrip keeps surrounding code and exposes provenance, finite values and diff', async () => {
  const { project, transport } = setup()
  await openPadding()
  expect(document.body.textContent).toContain('version 1')
  expect(
    document.querySelector('select[aria-label="Declared token values"]')
      ?.children,
  ).toHaveLength(4)
  await preview('2')
  expect(
    document.querySelector('[aria-label="Proposed source change"]')
      ?.textContent,
  ).toContain('Before1After2')
  expect(document.body.textContent).toContain('declared-dependencies')
  button('Apply source change').click()
  await vi.waitFor(() => expect(project.get(uri)?.version).toBe(2))
  expect(project.get(uri)?.text).toBe(
    source.replace('padding: 1', 'padding: 2'),
  )
  expect(transport.apply).toHaveBeenCalledTimes(1)
})

test('stale source cancels apply and preserves external edits', async () => {
  const { project, transport } = setup()
  await openPadding()
  await preview('2')
  const external = source.replace('padding: 1', 'padding: 0')
  project.update(uri, external, 2)
  button('Apply source change').click()
  await vi.waitFor(() =>
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'Source changed',
    ),
  )
  expect(transport.apply).not.toHaveBeenCalled()
  expect(project.get(uri)?.text).toBe(external)
})

test('opaque expressions show their source explanation without enabling literal replacement', async () => {
  setup()
  await vi.waitFor(() => expect(button('Root → opacity')).toBeTruthy())
  button('Root → opacity').click()
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain(
      'not a directly editable literal',
    ),
  )
  expect(document.querySelector('textarea')).toBeNull()
  expect(document.body.textContent).toContain('runtimeOpacity()')
})

test('disposal aborts pending work and late responses cannot resurrect the panel', async () => {
  let complete: ((page: ReturnType<DesignProject['query']>) => void) | undefined
  let signal: AbortSignal | undefined
  const { inspector, container } = setup({
    query: (_input, incoming) => {
      signal = incoming
      return new Promise((resolve) => {
        complete = resolve
      })
    },
  })
  expect(container.children).toHaveLength(1)
  inspector.dispose()
  inspector.dispose()
  expect(signal?.aborted).toBe(true)
  complete!({ items: [], total: 0, revision: 0 })
  await Promise.resolve()
  await Promise.resolve()
  expect(container.children).toHaveLength(0)
  await inspector.refresh()
  expect(container.children).toHaveLength(0)
})

test('editing while proposal is pending invalidates its response', async () => {
  let complete:
    | ((change: ReturnType<typeof proposeValueEdit>) => void)
    | undefined
  let proposed: ReturnType<typeof proposeValueEdit> | undefined
  const project = new DesignProject()
  project.update(uri, source, 1)
  setup({
    propose: (input) => {
      proposed = proposeValueEdit(project, input)
      return new Promise((resolve) => {
        complete = resolve
      })
    },
  })
  await openPadding()
  const editor = document.querySelector('textarea')!
  editor.value = '2'
  editor.dispatchEvent(new Event('input'))
  button('Preview source change').click()
  await vi.waitFor(() => expect(complete).toBeTruthy())
  editor.value = '0'
  editor.dispatchEvent(new Event('input'))
  complete!(proposed!)
  await Promise.resolve()
  await Promise.resolve()
  expect(button('Apply source change').disabled).toBe(true)
  expect(
    document.querySelector('[aria-label="Proposed source change"]')
      ?.textContent,
  ).toBe('')
})

test('invalid literal errors never call the editing transport', async () => {
  const propose = vi.fn<InspectorTransport['propose']>()
  setup({ propose })
  await openPadding()
  const editor = document.querySelector('textarea')!
  editor.value = 'doSomething()'
  button('Preview source change').click()
  await vi.waitFor(() =>
    expect(document.querySelector('[role="status"]')?.textContent).not.toBe(
      'Checking source change…',
    ),
  )
  expect(propose).not.toHaveBeenCalled()
  expect(button('Apply source change').disabled).toBe(true)
})

test('browser transport refuses to send its capability to a different origin', () => {
  expect(() =>
    createHttpInspectorTransport({
      endpoint: 'https://other.example/source',
      token: 'do-not-send',
    }),
  ).toThrow('same-origin')
})

test('imported system aliases offer values from the declaring module, including explicit sheet selection', async () => {
  const { project, transport, inspector } = setup()
  project.update(
    'file:///design/system.ts',
    source.split('// Preserve')[0]!.replace('const ui =', 'export const ui ='),
    1,
  )
  project.update(
    uri,
    `import { ui as imported } from './system'
export const styles = imported.stylesheet({ Root: { padding: 1 } })`,
    2,
  )
  transport.definition = async (input) =>
    project.lookup(input.name, input.uri)[0] ?? null
  await inspector.select({ uri, owner: 'styles' })
  await openPadding()
  const choices = document.querySelector<HTMLSelectElement>(
    'select[aria-label="Declared token values"]',
  )!
  expect([...choices.options].map((option) => option.textContent)).toEqual([
    'Choose a declared value',
    '0',
    '1',
    '2',
  ])
  choices.value = '2'
  choices.dispatchEvent(new Event('change'))
  expect(document.querySelector('textarea')!.value).toBe('2')
})

test.each([
  [404, 'text/html', '<html>Not found</html>', 'expected application/json'],
  [502, 'application/json', '<html>Gateway</html>', 'invalid JSON response'],
  [200, 'application/json', 'null', 'invalid JSON response'],
  [
    409,
    'application/json',
    JSON.stringify({ error: 'Source changed' }),
    'Source changed',
  ],
])(
  'HTTP %s responses expose useful bridge diagnostics',
  async (status, type, body, detail) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(body, { status, headers: { 'content-type': type } }),
      ),
    )
    const transport = createHttpInspectorTransport({
      endpoint: '/__toned/source',
      token: 'test',
    })
    await expect(
      transport.query({ limit: 1 }, new AbortController().signal),
    ).rejects.toThrow(`HTTP ${status}`)
    await expect(
      transport.query({ limit: 1 }, new AbortController().signal),
    ).rejects.toThrow(detail)
  },
)
