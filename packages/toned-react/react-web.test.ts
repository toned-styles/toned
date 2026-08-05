// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, defineToken, getConfig, setConfig } from '@toned/core'
import { createElement } from 'react'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { useStyles } from './index.ts'
import reactWebConfig from './react-web.ts'

// Install the web binding as the active global config. getTokens is overridden
// with a plain function: the real one resolves tokens via React's `use(context)`,
// which can't run inside the interaction handlers (they fire outside render).
const originalConfig = getConfig()
setConfig({ ...reactWebConfig, getTokens: () => ({}) })
afterAll(() => setConfig(originalConfig))

// Minimal token system: `cur` maps 1:1 to the CSS `cursor` value so assertions
// read back verbatim from happy-dom (no colour normalisation to reason about).
const { stylesheet } = defineSystem({
  cur: defineToken({
    values: ['pointer', 'grab'] as const,
    resolve: (v) => ({ cursor: v }),
  }),
})

// Two instances share ONE stylesheet; `:active` targets the element itself.
const styles = stylesheet({
  item: {
    cur: 'pointer',
    ':active': { cur: 'grab' },
  },
})

function List({ tick }: { tick: number }) {
  const s = useStyles(styles)
  // `s.item` is accessed once per button, so each element gets its own ref and
  // both register against the same shared Base — the multi-instance case.
  return createElement(
    'div',
    { 'data-tick': tick },
    createElement('button', {
      type: 'button',
      'data-testid': 'item-0',
      ...s.item,
    }),
    createElement('button', {
      type: 'button',
      'data-testid': 'item-1',
      ...s.item,
    }),
  )
}

afterEach(() => {
  cleanup()
  // A press registers a document-level mouseup listener; release it between tests.
  fireEvent.mouseUp(document)
})

describe('react-web multi-instance interaction isolation', () => {
  test('pressing one instance does not style its siblings', () => {
    const { getByTestId } = render(createElement(List, { tick: 0 }))
    const a = getByTestId('item-0')
    const b = getByTestId('item-1')

    expect(a.style.cursor).toBe('pointer')
    expect(b.style.cursor).toBe('pointer')

    fireEvent.mouseDown(a, { button: 0 })

    expect(a.style.cursor).toBe('grab')
    expect(b.style.cursor).toBe('pointer')
  })

  test('an unrelated re-render keeps interaction state isolated', () => {
    const { getByTestId, rerender } = render(createElement(List, { tick: 0 }))
    const a = getByTestId('item-0')
    const b = getByTestId('item-1')

    fireEvent.mouseDown(a, { button: 0 })
    expect(a.style.cursor).toBe('grab')
    expect(b.style.cursor).toBe('pointer')

    // Re-render the list for an unrelated reason. Before the resting-style fix,
    // React re-applied the *global* (pressed) style to every instance, leaking
    // `grab` onto B. With the fix the declarative style stays pseudo-free and
    // only A — restored via the ref callback — keeps its pressed state.
    rerender(createElement(List, { tick: 1 }))

    expect(a.style.cursor).toBe('grab')
    expect(b.style.cursor).toBe('pointer')
  })

  test('a single mounted instance still receives interaction styles', () => {
    function Solo() {
      const s = useStyles(styles)
      return createElement('button', {
        type: 'button',
        'data-testid': 'solo',
        ...s.item,
      })
    }
    const { getByTestId } = render(createElement(Solo))
    const el = getByTestId('solo')

    expect(el.style.cursor).toBe('pointer')
    fireEvent.mouseDown(el, { button: 0 })
    expect(el.style.cursor).toBe('grab')
  })
})
