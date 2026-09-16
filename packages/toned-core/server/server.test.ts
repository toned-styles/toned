import { expect, test } from 'vitest'
import { defineSystem, defineToken } from '../system/definers.ts'
import { createNativeRenderer } from './index.ts'

test('pure native rendering evaluates platform predicates against native', () => {
  const system = defineSystem({
    opacity: defineToken({
      values: [0, 1],
      resolve: (value) => ({ opacity: value }),
    }),
  })
  const sheet = system
    .stylesheet({ Root: { opacity: 1 } })
    .when(system.q.all(system.q.platform('native')), { Root: { opacity: 0 } })
  expect(
    createNativeRenderer(system, { tokens: {} }).resolve(sheet).Root.style[
      'opacity'
    ],
  ).toBe(0)
})
test('renderer theme snapshots and returned nested styles cannot mutate other resolutions', () => {
  const system = defineSystem({
    shadow: defineToken({
      values: ['base'],
      resolve: (_value, tokens) => ({ shadowOffset: tokens['offset'] }),
    }),
  })
  const sheet = system.stylesheet({ Root: { shadow: 'base' } })
  const tokens = { offset: { width: 2, height: 3 } }
  const renderer = createNativeRenderer(system, { tokens })
  tokens.offset.width = 100
  const output = renderer.resolve(sheet)
  expect(output.Root.style['shadowOffset']).toEqual({ width: 2, height: 3 })
  expect(Object.isFrozen(output.Root.style['shadowOffset'])).toBe(true)
})
