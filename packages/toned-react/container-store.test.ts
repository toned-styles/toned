import { expect, test } from 'vitest'
import { ContainerSizesStore } from './container-store.ts'

test('hierarchical widths shadow ancestors and equal updates preserve snapshots', () => {
  const outer = new ContainerSizesStore(undefined, { card: 100, sidebar: 200 })
  const inner = new ContainerSizesStore(outer, { card: 40 })
  const initial = inner.snapshot()
  let notifications = 0
  const stop = inner.subscribe(() => notifications++)
  outer.set('card', 300)
  expect(inner.snapshot()).toBe(initial)
  expect(notifications).toBe(0)
  outer.set('sidebar', 400)
  expect(inner.snapshot()).toEqual({ card: 40, sidebar: 400 })
  expect(notifications).toBe(1)
  inner.set('card', 40)
  expect(notifications).toBe(1)
  inner.set('card', 50)
  expect(notifications).toBe(2)
  expect(outer.snapshot()).toEqual({ card: 300, sidebar: 400 })
  stop()
  stop()
  outer.set('sidebar', 500)
  expect(notifications).toBe(2)
  expect(inner.snapshot()).toEqual({ card: 50, sidebar: 500 })
})
test('parents are subscribed lazily and released with the last dependent controller', () => {
  const outer = new ContainerSizesStore()
  const subscribe = outer.subscribe.bind(outer)
  let attached = 0
  outer.subscribe = (notify) => {
    attached++
    const stop = subscribe(notify)
    return () => {
      attached--
      stop()
    }
  }
  const inner = new ContainerSizesStore(outer)
  expect(attached).toBe(0)
  const first = inner.subscribe(() => {}),
    second = inner.subscribe(() => {})
  expect(attached).toBe(1)
  first()
  expect(attached).toBe(1)
  second()
  expect(attached).toBe(0)
  expect(() => inner.set('card', NaN)).toThrow(/finite nonnegative/)
  expect(() => inner.set('card', -1)).toThrow(/finite nonnegative/)
})

test('snapshot reads do not consume notifications owed to live descendants', () => {
  const outer = new ContainerSizesStore(undefined, { card: 100 })
  const inner = new ContainerSizesStore(outer)
  // Another parent listener (or a speculative render it triggers) reads first.
  const stopRead = outer.subscribe(() => {
    inner.snapshot()
  })
  let notifications = 0
  const stopChild = inner.subscribe(() => {
    notifications++
  })
  outer.set('card', 200)
  expect(inner.snapshot()).toEqual({ card: 200 })
  expect(notifications).toBe(1)
  inner.set('card', 300)
  expect(notifications).toBe(2)
  outer.set('card', 400) // shadowed parent change remains silent
  expect(notifications).toBe(2)
  stopRead()
  stopChild()
})
