// Focused coverage for the web :active reconciler (issue #2). Runs without a DOM
// or React: `./config.ts` (which imports react) is mocked away, `document`/
// `window` are stubbed with listener-recording fakes, and the real getProps
// handlers are driven against a lightweight Base mock. The full DOM-level
// interaction suite lives in the stacked react test PR.

import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('./config.ts', () => ({ default: {} }))

import reactWebConfig from './react-web.ts'

// biome-ignore lint/suspicious/noExplicitAny: test doubles use dynamic shapes
type AnyValue = any

function fakeEventTarget() {
  const listeners: Record<string, Set<() => void>> = {}
  return {
    addEventListener(type: string, fn: () => void) {
      let set = listeners[type]
      if (!set) {
        set = new Set()
        listeners[type] = set
      }
      set.add(fn)
    },
    removeEventListener(type: string, fn: () => void) {
      listeners[type]?.delete(fn)
    },
    dispatch(type: string) {
      for (const fn of [...(listeners[type] ?? [])]) fn()
    },
    count(type: string) {
      return listeners[type]?.size ?? 0
    },
  }
}

// Minimal Base stand-in exposing only what getProps' interactive path calls,
// with real per-pseudo membership so anyElementActive reflects the handlers.
function makeBaseMock() {
  const sets: Record<string, Set<AnyValue>> = {}
  const key = (pseudo: string) => `box${pseudo}`
  return {
    matcher: { interactions: { box: { ':hover': true, ':active': true } } },
    refs: {} as Record<string, AnyValue>,
    applyState: vi.fn(),
    getRestingStyle: () => ({ style: {} }),
    reapplyInteraction: vi.fn(),
    pruneDisconnected: vi.fn(),
    setElementActive(_key: string, pseudo: string, el: AnyValue, on: boolean) {
      const k = key(pseudo)
      let set = sets[k]
      if (!set) {
        set = new Set()
        sets[k] = set
      }
      if (on) set.add(el)
      else set.delete(el)
    },
    anyElementActive(_key: string, pseudo: string) {
      return (sets[key(pseudo)]?.size ?? 0) > 0
    },
  }
}

const getProps = (base: AnyValue): AnyValue =>
  reactWebConfig.getProps.call(base, 'box')

let doc: ReturnType<typeof fakeEventTarget>
let win: ReturnType<typeof fakeEventTarget>

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubDom() {
  doc = fakeEventTarget()
  win = fakeEventTarget()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', win)
}

describe('react-web :active reconciler', () => {
  test('a press registers release listeners on document and window', () => {
    stubDom()
    const base = makeBaseMock()
    const props = getProps(base)

    props.onMouseDown({ button: 0, currentTarget: { isConnected: true } })

    expect(base.anyElementActive('box', ':active')).toBe(true)
    expect(doc.count('mouseup')).toBe(1)
    expect(doc.count('pointercancel')).toBe(1)
    expect(win.count('blur')).toBe(1)
  })

  test('a window blur (release off-window) clears :active and removes every listener', () => {
    stubDom()
    const base = makeBaseMock()
    const props = getProps(base)
    props.onMouseDown({ button: 0, currentTarget: { isConnected: true } })

    // The release happens outside the window: no mouseup is delivered, but blur
    // fires. Previously the mouseup listener (and :active) leaked here.
    win.dispatch('blur')

    expect(base.anyElementActive('box', ':active')).toBe(false)
    expect(doc.count('mouseup')).toBe(0)
    expect(doc.count('pointercancel')).toBe(0)
    expect(win.count('blur')).toBe(0)
  })

  test('a normal mouseup ends the press and removes every listener', () => {
    stubDom()
    const base = makeBaseMock()
    const props = getProps(base)
    props.onMouseDown({ button: 0, currentTarget: { isConnected: true } })

    doc.dispatch('mouseup')

    expect(base.anyElementActive('box', ':active')).toBe(false)
    expect(doc.count('mouseup')).toBe(0)
    expect(doc.count('pointercancel')).toBe(0)
    expect(win.count('blur')).toBe(0)
  })

  test('a non-primary button does not start :active or register listeners', () => {
    stubDom()
    const base = makeBaseMock()
    const props = getProps(base)

    props.onMouseDown({ button: 2, currentTarget: { isConnected: true } })

    expect(base.anyElementActive('box', ':active')).toBe(false)
    expect(doc.count('mouseup')).toBe(0)
    expect(win.count('blur')).toBe(0)
  })

  test('mouseenter/leave toggle :hover through the Base helpers', () => {
    stubDom()
    const base = makeBaseMock()
    const props = getProps(base)
    const el = { isConnected: true }

    props.onMouseEnter({ currentTarget: el })
    expect(base.anyElementActive('box', ':hover')).toBe(true)

    props.onMouseLeave({ currentTarget: el })
    expect(base.anyElementActive('box', ':hover')).toBe(false)
  })
})
