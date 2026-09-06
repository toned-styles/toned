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
// The classic JSX runtime (jsx: preserve → esbuild transform) needs React in scope.
import * as React from 'react'
import { cq, defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { afterEach, describe, expect, test } from 'vitest'
import { bind, useBind } from './index.ts'
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
          <Child />
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
        Label: { w: 'narrow', [String(cq('card').below(100))]: { style: { display: 'none' } } },
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
