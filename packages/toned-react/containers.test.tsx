// @vitest-environment happy-dom

/**
 * The RUNTIME half of container queries: an element declaring
 * `container: '<name>'` measures itself through the config's
 * `measureContainerProps` seam and provides sizes to its subtree; descendant
 * sheets with `'@<name>/<step>'` keys resolve those keys as mods against the
 * nearest provided size. The css half (toggle vars + chains) is pinned in
 * toned-core (dom/generate.test.ts, system/definers.test.ts).
 */
import { act, cleanup, render } from '@testing-library/react'
import {
  cq,
  defineSystem,
  defineToken,
  getConfig,
  setConfig,
} from '@toned/core'
// The classic JSX runtime (jsx: preserve → esbuild transform) needs React in scope.
import * as React from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { bind, ContainerSizesContext, useBind } from './index.ts'
import reactWebConfig from './react-web.ts'

const { stylesheet } = defineSystem(
  {
    w: defineToken({
      values: ['narrow', 'wide'] as const,
      resolve: (v) => ({ width: v === 'narrow' ? '100px' : '400px' }),
    }),
  },
  // sm: 80 units × the default base (4px) = 320px.
  { containers: { card: { sm: 80 } } },
)

const cardStyles = stylesheet({ Root: { container: 'card' } })
const childStyles = stylesheet({
  Label: { w: 'narrow', '@card/sm': { w: 'wide' } },
})

function Child() {
  const s = useBind(childStyles)
  return <s.Label data-slot="l" />
}

const label = (container: HTMLElement) =>
  container.querySelector('[data-slot="l"]') as HTMLElement

afterEach(() => cleanup())

describe('runtime container queries (binding)', () => {
  test('a measured container drives a descendant sheet across the step', () => {
    const prev = { ...getConfig() }
    const sizeReporters: Array<(w: number) => void> = []
    let childRenders = 0
    function MeasuredChild() {
      childRenders++
      const s = useBind(childStyles)
      return <s.Label data-slot="l" />
    }
    setConfig({
      ...reactWebConfig,
      useClassName: false,
      mediaMode: 'runtime',
      getTokens: () => ({}),
      measureContainerProps: (onSize) => {
        sizeReporters.push(onSize)
        return { 'data-measured': 'yes' }
      },
    })
    try {
      const { Root } = bind(cardStyles)
      const { container } = render(
        <Root data-slot="r">
          <MeasuredChild />
        </Root>,
      )

      // The container element took the measure props from the seam.
      const root = container.querySelector('[data-slot="r"]') as HTMLElement
      expect(root.getAttribute('data-measured')).toBe('yes')
      expect(sizeReporters.length).toBe(1)

      // Unmeasured: the mobile-first base styles.
      expect(label(container).style.width).toBe('100px')

      act(() => sizeReporters[0]!(400))
      expect(label(container).style.width).toBe('400px')

      act(() => sizeReporters[0]!(200))
      expect(label(container).style.width).toBe('100px')
      expect(childRenders).toBe(1)
    } finally {
      setConfig(prev)
    }
  })

  test('a sheet outside any provider stays at base — no leak from a sibling', () => {
    const prev = { ...getConfig() }
    setConfig({
      ...reactWebConfig,
      useClassName: false,
      mediaMode: 'runtime',
      getTokens: () => ({}),
      measureContainerProps: () => ({}),
    })
    try {
      const { container } = render(<Child />)
      expect(label(container).style.width).toBe('100px')
    } finally {
      setConfig(prev)
    }
  })

  test('the css-hooks example, runtime: below(400) hides, measuring past it reveals', () => {
    const prev = { ...getConfig() }
    const sizeReporters: Array<(w: number) => void> = []
    setConfig({
      ...reactWebConfig,
      useClassName: false,
      mediaMode: 'runtime',
      getTokens: () => ({}),
      measureContainerProps: (onSize) => {
        sizeReporters.push(onSize)
        return {}
      },
    })
    try {
      const hideStyles = stylesheet({
        Label: { w: 'narrow' },
        [cq('card').below(100)]: { Label: { style: { display: 'none' } } },
      })
      function HideChild() {
        const s = useBind(hideStyles)
        return <s.Label data-slot="h" />
      }
      const { Root } = bind(cardStyles)
      const { container } = render(
        <Root>
          <HideChild />
        </Root>,
      )
      const el = () => container.querySelector('[data-slot="h"]') as HTMLElement
      // unmeasured acts as width 0 — below(400) holds, hidden
      expect(el().style.display).toBe('none')
      act(() => sizeReporters[0]!(500))
      expect(el().style.display).not.toBe('none')
      act(() => sizeReporters[0]!(300))
      expect(el().style.display).toBe('none')
    } finally {
      setConfig(prev)
    }
  })

  test('css mode attaches nothing — the generated toggles own it there', () => {
    const prev = { ...getConfig() }
    setConfig({
      ...reactWebConfig,
      useClassName: false,
      mediaMode: 'css',
      getTokens: () => ({}),
      measureContainerProps: () => ({ 'data-measured': 'yes' }),
    })
    try {
      const { Root } = bind(cardStyles)
      const { container } = render(<Root data-slot="r" />)
      const root = container.querySelector('[data-slot="r"]') as HTMLElement
      expect(root.getAttribute('data-measured')).toBeNull()
    } finally {
      setConfig(prev)
    }
  })
})

test('measurements update committed styles during Suspense and survive its later commit', async () => {
  const previous = { ...getConfig() }
  let report: ((width: number) => void) | undefined
  let select: React.Dispatch<React.SetStateAction<boolean>> | undefined
  let release!: () => void
  let ready = false
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const measured = childStyles.variants<{ on: boolean }>()(($) => ({
    [$.on(true)]: { Label: { $style: { opacity: 1 } } },
    [$.on(false)]: { Label: { $style: { opacity: 0 } } },
  }))
  setConfig({
    ...reactWebConfig,
    useClassName: false,
    mediaMode: 'runtime',
    getTokens: () => ({}),
    measureContainerProps(onSize) {
      report = onSize
      return {}
    },
  })
  try {
    function Child() {
      const [on, setOn] = React.useState(false)
      select = setOn
      const s = useBind(measured, { on })
      if (on && !ready) throw pending
      return <s.Label data-slot="l" />
    }
    const { Root } = bind(cardStyles)
    const view = render(
      <Root>
        <React.Suspense fallback={<span>pending</span>}>
          <Child />
        </React.Suspense>
      </Root>,
    )
    const target = label(view.container)
    act(() => React.startTransition(() => select!(true)))
    act(() => report!(400))
    expect(target.style.width).toBe('400px')
    expect(target.style.opacity).toBe('0')
    await act(async () => {
      ready = true
      release()
      await pending
    })
    expect(target.style.width).toBe('400px')
    expect(target.style.opacity).toBe('1')
  } finally {
    setConfig(previous)
  }
})

test('measurement handlers compose with caller handlers', () => {
  const previous = { ...getConfig() }
  let called = 0
  setConfig({
    ...reactWebConfig,
    useClassName: false,
    mediaMode: 'runtime',
    getTokens: () => ({}),
    measureContainerProps: (onSize) => ({ onClick: () => onSize(400) }),
  })
  try {
    const { Root } = bind(cardStyles)
    const view = render(
      <Root
        onClick={() => {
          called++
        }}
        data-testid="measure"
      >
        <Child />
      </Root>,
    )
    act(() => view.getByTestId('measure').click())
    expect(called).toBe(1)
    expect(label(view.container).style.width).toBe('400px')
  } finally {
    setConfig(previous)
  }
})

test('measurement refs and caller refs both attach and detach through a bound container', () => {
  const previous = { ...getConfig() }
  const caller = React.createRef<HTMLElement>()
  let measured: HTMLElement | null = null
  setConfig({
    ...reactWebConfig,
    useClassName: false,
    mediaMode: 'runtime',
    getTokens: () => ({}),
    measureContainerProps: (onSize) => ({
      ref: (node: HTMLElement | null) => {
        measured = node
        if (node) onSize(400)
      },
    }),
  })
  try {
    const { Root } = bind(cardStyles)
    const view = render(
      <Root ref={caller} data-testid="measure-ref">
        <Child />
      </Root>,
    )
    expect(measured).toBe(view.getByTestId('measure-ref'))
    expect(caller.current).toBe(measured)
    expect(label(view.container).style.width).toBe('400px')
    view.unmount()
    expect(caller.current).toBe(null)
    expect(measured).toBe(null)
  } finally {
    setConfig(previous)
  }
})

test('a measured width survives changes to inherited legacy context', () => {
  const previous = { ...getConfig() }
  let report: ((width: number) => void) | undefined
  setConfig({
    ...reactWebConfig,
    useClassName: false,
    mediaMode: 'runtime',
    getTokens: () => ({}),
    measureContainerProps: (onSize) => {
      report = onSize
      return {}
    },
  })
  try {
    const { Root } = bind(cardStyles)
    const tree = (outer: number) => (
      <ContainerSizesContext.Provider value={{ outer }}>
        <Root>
          <Child />
        </Root>
      </ContainerSizesContext.Provider>
    )
    const view = render(tree(100))
    act(() => report!(400))
    expect(label(view.container).style.width).toBe('400px')
    view.rerender(tree(200))
    expect(label(view.container).style.width).toBe('400px')
  } finally {
    setConfig(previous)
  }
})
