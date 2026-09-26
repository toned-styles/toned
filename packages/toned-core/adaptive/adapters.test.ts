import { expect, test, vi } from 'vitest'
import { createAdaptiveStore, defineAdaptiveLayout } from './index.ts'
import { nativeAdaptiveLayout } from './native.ts'
import { observeAdaptiveContainer, observeAdaptiveViewport } from './web.ts'

const definition = {
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  fallback: 'stack',
  layouts: {
    stack: { flow: 'stack' },
    wide: { flow: 'row', when: { minWidth: 600 } },
  },
} as const

test('container observer measures the explicit available space and disconnects without queued publication', () => {
  const layout = defineAdaptiveLayout(definition)
  const store = createAdaptiveStore(layout)
  let callback!: ResizeObserverCallback
  const observe = vi.fn()
  const disconnect = vi.fn()
  class Observer {
    constructor(cb: ResizeObserverCallback) {
      callback = cb
    }
    observe = observe
    disconnect = disconnect
  }
  const container = {} as Element
  const other = {} as Element
  const stop = observeAdaptiveContainer(
    store,
    container,
    Observer as unknown as typeof ResizeObserver,
  )
  expect(observe).toHaveBeenCalledWith(container)
  const deliver = (target: Element, width: number) =>
    callback(
      [{ target, contentRect: { width, height: 200 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    )
  deliver(other, 900)
  expect(store.getSnapshot().layout).toBe('stack')
  deliver(container, 900)
  expect(store.getSnapshot().layout).toBe('wide')
  expect(store.getMeasurements().content).toBeUndefined()
  stop()
  stop()
  expect(disconnect).toHaveBeenCalledTimes(1)
  deliver(container, 100)
  expect(store.getSnapshot().layout).toBe('wide')
})

test('failed observation releases its observer', () => {
  const disconnect = vi.fn()
  class Observer {
    observe() {
      throw new Error('detached host')
    }
    disconnect = disconnect
  }
  expect(() =>
    observeAdaptiveContainer(
      createAdaptiveStore(defineAdaptiveLayout(definition)),
      {} as Element,
      Observer as unknown as typeof ResizeObserver,
    ),
  ).toThrow('detached host')
  expect(disconnect).toHaveBeenCalledOnce()
})

test('viewport publishes dimensions only and releases the listener', () => {
  const layout = defineAdaptiveLayout({ ...definition, space: 'viewport' })
  const store = createAdaptiveStore(layout)
  const viewport = {
    innerWidth: 900,
    innerHeight: 400,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  const stop = observeAdaptiveViewport(store, viewport)
  expect(store.getSnapshot().layout).toBe('wide')
  expect(store.getMeasurements().textScale).toBeUndefined()
  const update = viewport.addEventListener.mock.calls[0]![1] as () => void
  viewport.innerWidth = 200
  update()
  expect(store.getSnapshot().layout).toBe('stack')
  stop()
  expect(viewport.removeEventListener).toHaveBeenCalledWith('resize', update)
  viewport.innerWidth = 900
  update()
  expect(store.getSnapshot().layout).toBe('stack')
})

test('native onLayout translates available parent dimensions and leaves environmental measurements explicit', () => {
  const store = createAdaptiveStore(defineAdaptiveLayout(definition), {
    textScale: 1.25,
    keyboardHeight: 20,
    safeArea: { bottom: 5 },
  })
  const onLayout = nativeAdaptiveLayout(store)
  onLayout({ nativeEvent: { layout: { width: 900, height: 300 } } })
  expect(store.getSnapshot().layout).toBe('wide')
  expect(store.getMeasurements()).toMatchObject({
    textScale: 1.25,
    keyboardHeight: 20,
    safeArea: { bottom: 5 },
    container: { width: 900, height: 300 },
  })
  expect(() =>
    onLayout({ nativeEvent: { layout: { width: -1, height: 300 } } }),
  ).toThrow('nonnegative')
  expect(store.getSnapshot().layout).toBe('wide')
})
