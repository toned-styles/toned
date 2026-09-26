// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig } from '@toned/core'
import { cssVariablesBackend } from '@toned/core/backends'
import { createRenderer } from '@toned/core/server'
import { type ComponentProps, createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test } from 'vitest'
import { createElements, TonedProvider, useBind, useStyles } from './index.ts'
import web from './react-web.ts'

afterEach(cleanup)
const first = defineSystem({
  ink: defineToken({
    values: [true],
    resolve: (_, tokens) => ({ color: tokens['ink'] }),
  }),
})
const second = defineSystem({
  ink: defineToken({
    values: [true],
    resolve: (_, tokens) => ({ color: tokens['ink'] }),
  }),
})
const firstSheet = first.stylesheet({ Root: { ink: true } }),
  secondSheet = second.stylesheet({ Root: { ink: true } })
const backend = {
  ...cssVariablesBackend,
  id: 'web-literals',
  browserConditions: false,
}
const red = createRenderer(first, { backend, tokens: { ink: 'red' } }),
  blue = createRenderer(second, { backend, tokens: { ink: 'blue' } })
function View({
  sheet = firstSheet,
  id = 'target',
}: {
  sheet?: typeof firstSheet
  id?: string
}) {
  const s = useStyles(sheet)
  return <div {...s.Root} data-testid={id} />
}

test('mixed systems select exact owners, isolate tokens, and inherit/override registrations in nested scopes', () => {
  const view = render(
    <TonedProvider renderer={[red, blue]} host={web}>
      <View id="first" />
      <View sheet={secondSheet} id="second" />
      <TonedProvider renderer={red} host={web} theme={{ ink: 'green' }}>
        <View id="nested-first" />
        <View sheet={secondSheet} id="nested-second" />
      </TonedProvider>
    </TonedProvider>,
  )
  expect(view.getByTestId('first').style.color).toBe('red')
  expect(view.getByTestId('second').style.color).toBe('blue')
  expect(view.getByTestId('nested-first').style.color).toBe('green')
  expect(view.getByTestId('nested-second').style.color).toBe('blue')
  expect(red.tokens).toEqual({ ink: 'red' })
})

test('theme changes and fresh/reordered renderer arrays preserve bound component and host identity', () => {
  function Bound() {
    const S = useBind(firstSheet)
    return <S.Root data-testid="bound" />
  }
  const wrap = (theme: string, reversed = false) => (
    <TonedProvider renderer={reversed ? [blue, red] : [red, blue]} host={web}>
      <TonedProvider renderer={red} host={web} theme={{ ink: theme }}>
        <Bound />
      </TonedProvider>
    </TonedProvider>
  )
  const view = render(wrap('red')),
    node = view.getByTestId('bound')
  view.rerender(wrap('green', true))
  expect(view.getByTestId('bound')).toBe(node)
  expect(node.style.color).toBe('green')
})

test('provider refuses duplicate systems, unknown owners, host mismatch and ambiguous array themes', () => {
  expect(() =>
    render(<TonedProvider renderer={[red, red]} host={web} />),
  ).toThrow(/duplicate/)
  expect(() =>
    render(
      <TonedProvider renderer={red} host={web}>
        <View sheet={secondSheet} />
      </TonedProvider>,
    ),
  ).toThrow(/no renderer registered/)
  expect(() =>
    render(
      <TonedProvider
        renderer={[red, blue]}
        host={{ ...web, platform: 'native' }}
      />,
    ),
  ).toThrow(/requires a web host/)
  const ambiguous = {
    renderer: [red],
    host: web,
    theme: { ink: 'green' },
  } as unknown as ComponentProps<typeof TonedProvider>
  expect(() => render(createElement(TonedProvider, ambiguous))).toThrow(
    /theme is only valid/,
  )
})

test('SSR requests and createElements use their own mixed registry without global setup', () => {
  const A = createElements(firstSheet),
    B = createElements(secondSheet)
  const tree = (ink: string) => (
    <TonedProvider renderer={[red, blue]} host={web}>
      <TonedProvider renderer={red} host={web} theme={{ ink }}>
        <A.Root />
        <B.Root />
      </TonedProvider>
    </TonedProvider>
  )
  expect(renderToString(tree('green'))).toContain('color:green')
  expect(renderToString(tree('black'))).toContain('color:black')
  expect(renderToString(tree('green'))).toContain('color:blue')
})

test('explicit providers do not even copy process-global configuration defaults', () => {
  const legacy = getConfig()
  Object.defineProperty(legacy, '__tonedProviderPoison', {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error('global configuration was read')
    },
  })
  try {
    const view = render(
      <TonedProvider renderer={[red, blue]} host={web}>
        <View />
      </TonedProvider>,
    )
    expect(view.getByTestId('target').style.color).toBe('red')
  } finally {
    Reflect.deleteProperty(legacy, '__tonedProviderPoison')
  }
})

test('equivalent renderer maps do not broadcast but changed tokens and registrations do', async () => {
  const { memo } = await import('react')
  let renders = 0
  const Consumer = memo(() => {
    renders++
    const s = useStyles(firstSheet)
    return <div {...s.Root} data-testid="target" />
  })
  const wrap = (renderers: (typeof red)[], theme?: { ink: string }) => (
    <TonedProvider renderer={renderers} host={{ ...web }}>
      <TonedProvider renderer={red} host={web} theme={theme}>
        <Consumer />
      </TonedProvider>
    </TonedProvider>
  )
  const view = render(wrap([red, blue]))
  expect(renders).toBe(1)
  view.rerender(wrap([blue, red]))
  expect(renders).toBe(1)
  const theme = { ink: 'green' }
  view.rerender(wrap([red, blue], theme))
  expect(renders).toBe(2)
  expect(view.getByTestId('target').style.color).toBe('green')
  view.rerender(wrap([blue, red], theme))
  expect(renders).toBe(2)
  view.rerender(wrap([red]))
  expect(renders).toBe(3)
  expect(view.getByTestId('target').style.color).toBe('red')
})

test('suspended provider themes never publish into committed component-family updates', async () => {
  const { Suspense, startTransition, useState } = await import('react')
  const pending = new Promise<void>(() => {})
  const themedSheet = first.stylesheet({
    Root: { ink: true, ':hover': { $style: { opacity: 0.5 } } },
  })
  let set: (value: { ink: string; blocked: boolean }) => void = () => {}
  function Consumer({ blocked }: { blocked: boolean }) {
    const s = useStyles(themedSheet)
    const props = s.Root
    if (blocked) throw pending
    return <div {...props} data-testid="concurrent" />
  }
  function App() {
    const [state, update] = useState({ ink: 'red', blocked: false })
    set = update
    return (
      <Suspense fallback={<span>pending</span>}>
        <TonedProvider renderer={[red, blue]} host={web}>
          <TonedProvider renderer={red} host={web} theme={{ ink: state.ink }}>
            <Consumer blocked={state.blocked} />
          </TonedProvider>
        </TonedProvider>
      </Suspense>
    )
  }
  const view = render(<App />),
    node = view.getByTestId('concurrent')
  await act(async () => {
    startTransition(() => set({ ink: 'green', blocked: true }))
  })
  expect(node.style.color).toBe('red')
  node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  expect(node.style.opacity).toBe('0.5')
  expect(node.style.color).toBe('red')
  await act(async () => set({ ink: 'blue', blocked: false }))
  expect(view.getByTestId('concurrent')).toBe(node)
  expect(node.style.color).toBe('blue')
  expect(node.style.opacity).toBe('0.5')
})
