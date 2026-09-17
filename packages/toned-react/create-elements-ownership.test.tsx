// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem } from '@toned/core'
import { defineGrid, fr } from '@toned/core/grid'
import { Base } from '@toned/core/stylesheet'
import type { Window } from 'happy-dom'
import * as React from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  ConfigProvider,
  createElements,
  overrideStyles,
  StyleOverrides,
} from './index.ts'
import web from './react-web.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const config = {
  ...web,
  getTokens: () => ({}),
  useClassName: false,
  mediaMode: false as const,
  pseudoMode: 'runtime' as const,
}
const system = defineSystem({ id: 'elements-ownership', tokens: {} })
const base = system.stylesheet({
  Root: {},
  Label: { $style: { opacity: 1 } },
  Independent: { $style: { opacity: 0.75 } },
})
const related = base.when(system.q.all(system.q.part('Root').state('hover')), {
  Label: { $style: { opacity: 0.5 } },
})
const S = createElements(related)
function mount(children: React.ReactNode) {
  return render(React.createElement(ConfigProvider, { config }, children))
}

class GridBoundary extends React.Component<
  { children: React.ReactNode; errors: Error[] },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: Error) {
    this.props.errors.push(error)
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

function withBrowserErrorReporting(run: () => void) {
  // React 18's development commit guard dispatches a DOM event and expects
  // browser error reporting. Vitest disables that Happy DOM behavior, making
  // dispatchEvent throw through React's work loop before its boundary can run.
  // Restore browser behavior only for the deliberately invalid commit.
  const settings = (window as unknown as Window).happyDOM.settings
  const previous = settings.disableErrorCapturing
  settings.disableErrorCapturing = false
  try {
    run()
  } finally {
    settings.disableErrorCapturing = previous
  }
}

test('standalone related sources and targets throw a named missing-scope error; unrelated parts work', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  for (const Component of [S.Root, S.Label])
    expect(() => mount(<Component />)).toThrowError(
      expect.objectContaining({
        name: 'TonedMissingScopeError',
        message: expect.stringContaining('<S>'),
      }),
    )
  const view = mount(<S.Independent data-testid="independent" />)
  expect(view.getByTestId('independent').style.opacity).toBe('0.75')
})

test('cross-part interaction stays inside sibling provider instances', () => {
  const view = mount(
    <>
      <S>
        <S.Root data-testid="a-root">
          <S.Label data-testid="a-label" />
        </S.Root>
      </S>
      <S>
        <S.Root data-testid="b-root">
          <S.Label data-testid="b-label" />
        </S.Root>
      </S>
    </>,
  )
  const first = view.getByTestId('a-label')
  const second = view.getByTestId('b-label')
  expect(first.style.opacity).toBe('1')
  expect(second.style.opacity).toBe('1')
  fireEvent.mouseEnter(view.getByTestId('a-root'))
  expect(first.style.opacity).toBe('0.5')
  expect(second.style.opacity).toBe('1')
  fireEvent.mouseLeave(view.getByTestId('a-root'))
  fireEvent.mouseEnter(view.getByTestId('b-root'))
  expect(first.style.opacity).toBe('1')
  expect(second.style.opacity).toBe('0.5')
})

test('relationship topology participants require scope and scoped descendant states update styles', () => {
  const sheet = system
    .stylesheet({ Root: { $style: { opacity: 1 } }, Item: {} })
    .when(system.q.part('Root').has('Item', 'hover'), {
      Root: { $style: { opacity: 0.5 } },
    })
  const Related = createElements(sheet)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => mount(<Related.Item />)).toThrowError(
    expect.objectContaining({ name: 'TonedMissingScopeError' }),
  )
  const view = mount(
    <Related>
      <Related.Root data-testid="owner">
        <Related.Item data-testid="item" />
      </Related.Root>
    </Related>,
  )
  fireEvent.mouseEnter(view.getByTestId('item'))
  expect(view.getByTestId('owner').style.opacity).toBe('0.5')
  fireEvent.mouseLeave(view.getByTestId('item'))
  expect(view.getByTestId('owner').style.opacity).toBe('1')
})

test('grid owners and areas require their provider and retain direct-parent layout validation', () => {
  const grid = defineGrid('elements-layout', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const G = createElements(
    system.stylesheet({
      Root: { '@platform web': { $grid: grid } },
      Body: { '@platform web': { $area: grid.area('body') } },
    }),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
  for (const Component of [G.Root, G.Body])
    expect(() => mount(<Component />)).toThrowError(
      expect.objectContaining({ name: 'TonedMissingScopeError' }),
    )
  const errors: Error[] = []
  // Both the provider and individual hosts validate in commit effects. Let
  // React recover through a boundary instead of interrupting its work loop by
  // catching multiple commit errors outside render (especially on React 18).
  const view = mount(
    <GridBoundary errors={errors}>
      <G>
        <G.Root data-testid="grid">
          <G.Body data-testid="body" />
        </G.Root>
      </G>
    </GridBoundary>,
  )
  expect(errors).toEqual([])
  expect(view.getByTestId('grid').style.display).toBe('grid')
  expect(view.getByTestId('body').style.gridArea).not.toBe('')
  withBrowserErrorReporting(() => {
    mount(
      <GridBoundary errors={errors}>
        <G>
          <G.Root>
            <div>
              <G.Body />
            </div>
          </G.Root>
        </G>
      </GridBoundary>,
    )
  })
  expect(errors.length).toBeGreaterThan(0)
  for (const error of errors) expect(error.message).toMatch(/direct parent/)
})

test('a local descendant host replacement validates grid ownership without rerendering its provider', () => {
  const grid = defineGrid('replacement-layout', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const G = createElements(
    system.stylesheet({
      Root: { '@platform web': { $grid: grid } },
      Body: { '@platform web': { $area: grid.area('body') } },
    }),
  )
  const Wrapped = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
    (props, ref) => (
      <div>
        <div {...props} ref={ref} />
      </div>
    ),
  )
  function ChangingBody() {
    const [wrapped, setWrapped] = React.useState(false)
    return (
      <>
        <button type="button" onClick={() => setWrapped(true)}>
          Wrap area
        </button>
        <G.Body as={wrapped ? Wrapped : 'div'} data-testid="changing-body" />
      </>
    )
  }
  let providerCommits = 0
  function Instance() {
    React.useLayoutEffect(() => {
      providerCommits++
    })
    return (
      <G>
        <G.Root data-testid="changing-grid">
          <ChangingBody />
        </G.Root>
      </G>
    )
  }
  const errors: Error[] = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const view = mount(
    <GridBoundary errors={errors}>
      <Instance />
    </GridBoundary>,
  )
  expect(errors).toEqual([])
  expect(view.getByTestId('changing-body').parentElement).toBe(
    view.getByTestId('changing-grid'),
  )
  withBrowserErrorReporting(() => fireEvent.click(view.getByText('Wrap area')))
  expect(providerCommits).toBe(1)
  expect(errors.length).toBeGreaterThan(0)
  for (const error of errors) expect(error.message).toMatch(/direct parent/)
})

test('validating repeated hosts stays linear through provider and descendant-only commits', () => {
  const count = 24
  const items = Array.from({ length: count }, (_, id) => ({ id }))
  const Repeated = createElements(
    system
      .stylesheet({ Item: { $style: { opacity: 1 } } })
      .variants<{ compact: boolean }>()(($) => ({
      [$.compact(true)]: { Item: { $style: { opacity: 0.5 } } },
    })),
  )
  // The host integration is shared by system. Instrument it through a probe
  // controller without introducing a public export just for this assertion.
  const probe = new Base({ ref: system, rules: {}, config })
  const validate = vi.spyOn(
    Reflect.get(probe, 'host') as { validate(node: object): void },
    'validate',
  )
  function Items() {
    const [revision, setRevision] = React.useState(0)
    return (
      <>
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          Refresh items
        </button>
        {items.map(({ id }) => (
          <Repeated.Item key={id} data-item={id} data-revision={revision} />
        ))}
      </>
    )
  }
  const ui = (compact: boolean) => (
    <ConfigProvider config={config}>
      <Repeated compact={compact}>
        <Items />
      </Repeated>
    </ConfigProvider>
  )
  const assertLinear = () => {
    expect(new Set(validate.mock.calls.map(([node]) => node)).size).toBe(count)
    // Allow one ownership pass and one attachment pass; a pass for every
    // repeated part would make this grow quadratically with the list length.
    expect(validate.mock.calls.length).toBeLessThanOrEqual(count * 2)
  }
  const view = render(ui(false))
  assertLinear()
  validate.mockClear()
  view.rerender(ui(true))
  assertLinear()
  for (const node of view.container.querySelectorAll<HTMLElement>(
    '[data-item]',
  ))
    expect(node.style.opacity).toBe('0.5')
  validate.mockClear()
  fireEvent.click(view.getByText('Refresh items'))
  assertLinear()
})

test('moving the owner ref revalidates grid areas whose host refs did not change', () => {
  const grid = defineGrid('retained-child-layout', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const G = createElements(
    system.stylesheet({
      Root: { '@platform web': { $grid: grid } },
      Body: { '@platform web': { $area: grid.area('body') } },
    }),
  )
  const Shell = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'> & { attachOuter: boolean }
  >(({ children, attachOuter, ...props }, ref) => (
    <div {...(attachOuter ? props : {})} ref={attachOuter ? ref : undefined}>
      <div {...(attachOuter ? {} : props)} ref={attachOuter ? undefined : ref}>
        {children}
      </div>
    </div>
  ))
  let bodyAttachments = 0
  const bodyRef = (node: HTMLDivElement | null) => {
    if (node) bodyAttachments++
  }
  function ChangingOwner() {
    const [attachOuter, setAttachOuter] = React.useState(false)
    const body = React.useMemo(
      () => <G.Body as="div" ref={bodyRef} data-testid="retained-body" />,
      [],
    )
    return (
      <>
        <button type="button" onClick={() => setAttachOuter(true)}>
          Move owner ref
        </button>
        <G.Root as={Shell} attachOuter={attachOuter} data-testid="owner-ref">
          {body}
        </G.Root>
      </>
    )
  }
  const errors: Error[] = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const view = mount(
    <GridBoundary errors={errors}>
      <G>
        <ChangingOwner />
      </G>
    </GridBoundary>,
  )
  expect(errors).toEqual([])
  expect(bodyAttachments).toBe(1)
  expect(view.getByTestId('retained-body').parentElement).toBe(
    view.getByTestId('owner-ref'),
  )
  withBrowserErrorReporting(() =>
    fireEvent.click(view.getByText('Move owner ref')),
  )
  expect(bodyAttachments).toBe(1)
  expect(errors.length).toBeGreaterThan(0)
  for (const error of errors) expect(error.message).toMatch(/direct parent/)
})

test('an internal custom host ref move validates retained grid areas without rerendering styled parts', () => {
  const grid = defineGrid('internal-ref-layout', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const G = createElements(
    system.stylesheet({
      Root: { '@platform web': { $grid: grid } },
      Body: { '@platform web': { $area: grid.area('body') } },
    }),
  )
  const getProps = vi.fn(web.getProps)
  const localConfig = { ...config, getProps }
  let shellCommits = 0
  const Shell = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
    ({ children, ...props }, ref) => {
      const [attachOuter, setAttachOuter] = React.useState(false)
      React.useLayoutEffect(() => {
        shellCommits++
      })
      return (
        <>
          <button type="button" onClick={() => setAttachOuter(true)}>
            Move internal ref
          </button>
          <div
            {...(attachOuter ? props : {})}
            ref={attachOuter ? ref : undefined}
          >
            <div
              {...(attachOuter ? {} : props)}
              ref={attachOuter ? undefined : ref}
            >
              {children}
            </div>
          </div>
        </>
      )
    },
  )
  let bodyAttachments = 0
  const bodyRef = (node: HTMLDivElement | null) => {
    if (node) bodyAttachments++
  }
  let ownerCommits = 0
  function Instance() {
    React.useLayoutEffect(() => {
      ownerCommits++
    })
    return (
      <G>
        <G.Root as={Shell} data-testid="internal-owner">
          <G.Body as="div" ref={bodyRef} data-testid="internal-body" />
        </G.Root>
      </G>
    )
  }
  const errors: Error[] = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const view = render(
    <ConfigProvider config={localConfig}>
      <GridBoundary errors={errors}>
        <Instance />
      </GridBoundary>
    </ConfigProvider>,
  )
  expect(errors).toEqual([])
  expect(view.getByTestId('internal-body').parentElement).toBe(
    view.getByTestId('internal-owner'),
  )
  const initialReads = getProps.mock.calls.length
  expect(initialReads).toBe(2)
  withBrowserErrorReporting(() =>
    fireEvent.click(view.getByText('Move internal ref')),
  )
  expect(ownerCommits).toBe(1)
  expect(shellCommits).toBe(2)
  expect(getProps.mock.calls.length).toBe(initialReads)
  expect(bodyAttachments).toBe(1)
  expect(errors.length).toBeGreaterThan(0)
  for (const error of errors) expect(error.message).toMatch(/direct parent/)
})

test('a live subtree override can introduce a standalone scope requirement', () => {
  const Independent = createElements(base)
  const added = overrideStyles(base, {
    'Root:hover': { Label: { $style: { opacity: 0.5 } } },
  })
  const wrap = (enabled: boolean) => (
    <ConfigProvider config={config}>
      <StyleOverrides value={enabled ? [added] : []}>
        <Independent.Label data-testid="label" />
      </StyleOverrides>
    </ConfigProvider>
  )
  const view = render(wrap(false))
  expect(view.getByTestId('label').style.opacity).toBe('1')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => view.rerender(wrap(true))).toThrowError(
    expect.objectContaining({ name: 'TonedMissingScopeError' }),
  )
})

test('removing a cross-part rule through subtree overrides permits a standalone part', () => {
  const sheet = system.stylesheet({
    Root: {},
    Label: { $style: { opacity: 1 } },
    'Root:hover': { Label: { $style: { opacity: 0.5 } } },
  })
  const Standalone = createElements(sheet)
  const removed = overrideStyles(sheet, {
    'Root:hover': { Label: { $style: { opacity: null } } },
  })
  const wrap = (enabled: boolean) => (
    <ConfigProvider config={config}>
      <StyleOverrides value={enabled ? [removed] : []}>
        <Standalone.Label data-testid="label" />
      </StyleOverrides>
    </ConfigProvider>
  )
  const view = render(wrap(true))
  expect(view.getByTestId('label').style.opacity).toBe('1')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => view.rerender(wrap(false))).toThrowError(
    expect.objectContaining({ name: 'TonedMissingScopeError' }),
  )
})
