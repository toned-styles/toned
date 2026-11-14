import { expect, test } from 'vitest'

import { createTestClock } from './clock.ts'

test('a test clock steps time in frames and never sleeps', () => {
  const clock = createTestClock({ frame: 10 })
  const seen: number[] = []
  const loop = (time: number) => {
    seen.push(time)
    if (time < 40) clock.request(loop)
  }
  clock.request(loop)
  expect(clock.pending).toBe(1)
  expect(clock.advance(25)).toBe(3)
  expect(seen).toEqual([10, 20, 25])
  expect(clock.now()).toBe(25)
  clock.advance(100)
  expect(seen).toEqual([10, 20, 25, 35, 45])
  expect(clock.pending).toBe(0)
})

test('callbacks requested during a frame run in the next one', () => {
  const clock = createTestClock()
  const order: string[] = []
  clock.request(() => {
    order.push('a')
    clock.request(() => order.push('b'))
  })
  clock.frame()
  expect(order).toEqual(['a'])
  clock.frame()
  expect(order).toEqual(['a', 'b'])
  expect(clock.now()).toBe(32)
})

test('cancelled callbacks do not run, and one clock drives every subscriber', () => {
  const clock = createTestClock({ start: 100 })
  const calls: string[] = []
  const handle = clock.request(() => calls.push('cancelled'))
  clock.request(() => calls.push('one'))
  clock.request(() => calls.push('two'))
  clock.cancel(handle)
  clock.advance(16)
  expect(calls).toEqual(['one', 'two'])
  expect(clock.now()).toBe(116)
  expect(() => clock.advance(-1)).toThrow('non-negative')
})
