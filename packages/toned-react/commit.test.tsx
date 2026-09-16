import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { createTailwindBackend } from '@toned/core/backends'
// @vitest-environment happy-dom
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test } from 'vitest'
import { ConfigProvider, useBind, useStyles } from './index.ts'
import web from './react-web.ts'

const original = getConfig()
afterEach(() => {
  cleanup()
  setConfig(original)
})
const system = defineSystem({
  opacity: defineToken({
    values: [0, 0.5, 1] as const,
    resolve: (v: number) => ({ opacity: v }),
  }),
})
const sheet = system
  .stylesheet({ Root: { opacity: 0, ':hover': { opacity: 0.5 } } })
  .variants<{ on: boolean }>(($) => ({
    [$.on(true)]: { Root: { opacity: 1 } },
  }))
const blocker = new Promise<never>(() => {})
const install = () =>
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })

for (const bound of [false, true])
  test(`suspended ${bound ? 'useBind' : 'useStyles'} cannot publish candidate inputs`, async () => {
    install()
    let attempted = false
    function View({ on }: { on: boolean }) {
      const styles = useStyles(sheet, { on })
      const parts = useBind(sheet, { on })
      if (on) {
        attempted = true
        throw blocker
      }
      return bound ? (
        <parts.Root data-testid="target" />
      ) : (
        <div {...styles.Root} data-testid="target" />
      )
    }
    const ui = (on: boolean) => (
      <React.Suspense fallback="waiting">
        <View on={on} />
      </React.Suspense>
    )
    const view = render(ui(false))
    const target = view.getByTestId('target')
    await act(() => React.startTransition(() => view.rerender(ui(true))))
    expect(attempted).toBe(true)
    expect(target.style.opacity).toBe('0')
    // Events during the pending transition continue with committed inputs.
    fireEvent.mouseEnter(target)
    expect(target.style.opacity).toBe('0.5')
    fireEvent.mouseLeave(target)
    expect(target.style.opacity).toBe('0')
  })

test('a committed theme updates an unchanged matching rule', () => {
  const Theme = React.createContext({ ink: 'red' })
  setConfig({
    ...web,
    getTokens: () => React.useContext(Theme),
    useClassName: false,
    mediaMode: false,
  })
  const themed = defineSystem({
    ink: defineToken({
      values: [true] as const,
      resolve: (_: boolean, tokens: any) => ({ color: tokens.ink }),
    }),
  }).stylesheet({ Root: { ink: true } })
  function View() {
    const s = useStyles(themed)
    return <div {...s.Root} data-testid="target" />
  }
  const view = render(
    <Theme.Provider value={{ ink: 'red' }}>
      <View />
    </Theme.Provider>,
  )
  expect(view.getByTestId('target').style.color).toBe('red')
  view.rerender(
    <Theme.Provider value={{ ink: 'blue' }}>
      <View />
    </Theme.Provider>,
  )
  expect(view.getByTestId('target').style.color).toBe('blue')
})

test('Strict Mode ref replacement cleans up each generation and preserves caller props', () => {
  install()
  let attached = 0
  let calls = 0
  const caller = () => {
    attached++
    return () => {
      attached--
    }
  }
  function View({ on }: { on: boolean }) {
    const s = useStyles(sheet, { on })
    return (
      <div
        {...s.Root.withProps({
          ref: caller,
          style: { width: 17 },
          onMouseEnter: () => calls++,
        })}
        data-testid="target"
      />
    )
  }
  const view = render(
    <React.StrictMode>
      <View on={false} />
    </React.StrictMode>,
  )
  expect(attached).toBe(1)
  const target = view.getByTestId('target')
  fireEvent.mouseEnter(target)
  expect(calls).toBe(1)
  expect(target.style.width).toBe('17px')
  view.rerender(
    <React.StrictMode>
      <View on={true} />
    </React.StrictMode>,
  )
  expect(attached).toBe(1)
  expect(target.style.width).toBe('17px')
  view.unmount()
  expect(attached).toBe(0)
})

test('bound props snapshots are render-local while component identities stay stable', () => {
  install()
  const seen: Array<{ part: unknown; props: unknown }> = []
  function View({ on }: { on: boolean }) {
    const s = useBind(sheet, { on })
    seen.push({ part: s.Root, props: s.$props.Root.style })
    return <div {...s.$props.Root} data-testid="target" />
  }
  const view = render(<View on={false} />)
  view.rerender(<View on={true} />)
  expect(seen[0]!.part).toBe(seen[1]!.part)
  expect(seen[0]!.props).toEqual({ opacity: 0 })
  expect(seen[1]!.props).toEqual({ opacity: 1 })
  expect(view.getByTestId('target').style.opacity).toBe('1')
})

test('renderer configs are isolated between simultaneous provider trees', () => {
  install()
  const config = getConfig()
  const themed = defineSystem({
    ink: defineToken({
      values: [true] as const,
      resolve: (_: boolean, tokens: any) => ({ color: tokens.ink }),
    }),
  }).stylesheet({ Root: { ink: true } })
  function View({ id }: { id: string }) {
    const s = useBind(themed)
    return <s.Root data-testid={id} />
  }
  const view = render(
    <>
      <ConfigProvider config={{ ...config, getTokens: () => ({ ink: 'red' }) }}>
        <View id="red" />
      </ConfigProvider>
      <ConfigProvider
        config={{ ...config, getTokens: () => ({ ink: 'blue' }) }}
      >
        <View id="blue" />
      </ConfigProvider>
    </>,
  )
  expect(view.getByTestId('red').style.color).toBe('red')
  expect(view.getByTestId('blue').style.color).toBe('blue')
  expect(getConfig()).toBe(config)
})

test('an opt-in render scope exposes new bound styles to child layout effects', () => {
  install()
  const measured: string[] = []
  function Measure() {
    React.useLayoutEffect(() => {
      measured.push(
        (document.querySelector('[data-measure]') as HTMLElement).style.opacity,
      )
    })
    return null
  }
  function View({ on }: { on: boolean }) {
    const s = useBind(sheet, { on })
    return s.$scope(
      <s.Root data-measure="">
        <Measure />
      </s.Root>,
    )
  }
  const view = render(<View on={false} />)
  view.rerender(<View on={true} />)
  expect(measured).toEqual(['0', '1'])
})

test('a scoped bound child that suspends cannot leak its candidate styles', async () => {
  install()
  function Child({ on }: { on: boolean }) {
    if (on) throw blocker
    return null
  }
  function View({ on }: { on: boolean }) {
    const s = useBind(sheet, { on })
    return s.$scope(
      <s.Root data-testid="target">
        <Child on={on} />
      </s.Root>,
    )
  }
  const ui = (on: boolean) => (
    <React.Suspense fallback="waiting">
      <View on={on} />
    </React.Suspense>
  )
  const view = render(ui(false))
  await act(() => React.startTransition(() => view.rerender(ui(true))))
  expect(view.getByTestId('target').style.opacity).toBe('0')
})

test('an explicit Tailwind backend patches classes through a mounted host without rendering React', () => {
  install()
  const backend = createTailwindBackend({
    id: 'test-utilities',
    mappings: [
      { field: 'opacity', value: 0, utility: 'opacity-0' },
      { field: 'opacity', value: 0.5, utility: 'opacity-50' },
      { field: 'opacity', value: 1, utility: 'opacity-100' },
    ],
  })
  let renders = 0
  function View() {
    renders++
    const s = useStyles(sheet, { on: false })
    return <div {...s.Root} data-testid="utility" />
  }
  const view = render(
    <ConfigProvider config={{ ...getConfig(), backend }}>
      <View />
    </ConfigProvider>,
  )
  const target = view.getByTestId('utility')
  expect(target.className).toBe('opacity-0')
  fireEvent.mouseEnter(target)
  expect(target.className).toBe('opacity-50')
  fireEvent.mouseLeave(target)
  expect(target.className).toBe('opacity-0')
  expect(renders).toBe(1)
})

test('scoped bound styles render on the server and hydrate without runtime CSS insertion', async () => {
  install()
  function View() {
    const s = useBind(sheet, { on: true })
    return s.$scope(<s.Root data-testid="hydrated">Ready</s.Root>)
  }
  const headNodes = document.head.childElementCount
  const host = document.createElement('div')
  host.innerHTML = renderToString(<View />)
  document.body.append(host)
  expect((host.firstElementChild as HTMLElement).style.opacity).toBe('1')
  let root: ReturnType<typeof hydrateRoot>
  await act(() => {
    root = hydrateRoot(host, <View />)
  })
  expect((host.firstElementChild as HTMLElement).style.opacity).toBe('1')
  expect(document.head.childElementCount).toBe(headNodes)
  await act(() => root!.unmount())
  host.remove()
})

test('composed bound components keep independent ownership on the same host', () => {
  install()
  setConfig({ useClassName: true })
  const outer = defineSystem({}).stylesheet({ Label: {} })
  function Inner(props: React.ComponentProps<'label'>) {
    const s = useBind(sheet, { on: false })
    return <s.Root as="label" {...props} />
  }
  function View({ tick }: { tick: number }) {
    const s = useBind(outer)
    return (
      <s.Label
        as={Inner}
        className="caller"
        data-testid="composed"
        data-tick={tick}
      />
    )
  }
  const view = render(<View tick={0} />)
  const target = view.getByTestId('composed')
  expect(target.classList.contains('opacity_0')).toBe(true)
  fireEvent.mouseEnter(target)
  expect(target.classList.contains('opacity_0.5')).toBe(true)
  view.rerender(<View tick={1} />)
  expect(target.classList.contains('opacity_0.5')).toBe(true)
  fireEvent.mouseLeave(target)
  expect(target.classList.contains('opacity_0')).toBe(true)
  expect(target.classList.contains('caller')).toBe(true)
})

test('repeated props snapshot reads bind independent hosts and interaction state', () => {
  install()
  function View({ on }: { on: boolean }) {
    const s = useBind(sheet, { on })
    return (
      <>
        <div {...s.$props.Root} data-testid="first" />
        <div {...s.$props.Root} data-testid="second" />
      </>
    )
  }
  const view = render(<View on={false} />)
  const first = view.getByTestId('first')
  const second = view.getByTestId('second')
  fireEvent.mouseEnter(first)
  expect(first.style.opacity).toBe('0.5')
  expect(second.style.opacity).toBe('0')
  view.rerender(<View on={false} />)
  expect(first.style.opacity).toBe('0.5')
  expect(second.style.opacity).toBe('0')
  fireEvent.mouseLeave(first)
  fireEvent.mouseEnter(second)
  expect(first.style.opacity).toBe('0')
  expect(second.style.opacity).toBe('0.5')
})
