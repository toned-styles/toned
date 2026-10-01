import { expect, test } from 'vitest'

import { defineSystem, defineToken } from '../index.ts'
import { createTokenStyles } from '../server/index.ts'
import { SYMBOL_STYLE } from '../utils/symbols.ts'

const system = defineSystem(
  {
    padding: defineToken({
      values: [0, 8, 16] as const,
      resolve: (value) => ({ padding: value }),
    }),
    gap: defineToken({
      values: [0, 8, 16] as const,
      resolve: (value) => ({ gap: value }),
    }),
  },
  { breakpoints: { __breakpoints: { md: 600 } } },
)
const t = createTokenStyles(system, {
  platform: 'web',
  tokens: {},
  useClassName: false,
})

test('falsy arguments and nested t values compose without reading resolved getters', () => {
  const nested = t({ padding: 8 })
  const result = t(
    false,
    null,
    undefined,
    { '@md': nested },
    { '@md': { gap: 16 } },
  )
  expect(Reflect.get(result, SYMBOL_STYLE)).toEqual({
    '@md': { padding: 8, gap: 16 },
  })
  expect(JSON.stringify(result.style)).toContain('16')
})
test('repeated selectors preserve earlier fields and later values win', () => {
  const result = t(
    { ':hover': { padding: 8, $style: { opacity: 0.5 } } },
    { ':hover': { padding: 16, $style: { borderRadius: 4 } } },
  )
  expect(Reflect.get(result, SYMBOL_STYLE)).toEqual({
    ':hover': { padding: 16, style: { opacity: 0.5, borderRadius: 4 } },
  })
})
test('platform blocks remain platform predicates during composition', () => {
  const value = {
    padding: 8,
    '@platform web': { padding: 16 },
    '@platform native': { padding: 0 },
  } as const
  expect(t(value).style['padding']).toBe(16)
  expect(
    createTokenStyles(system, { platform: 'native', tokens: {} })(value).style[
      'padding'
    ],
  ).toBe(0)
})
test('native style arrays compose left to right without mutating inputs', () => {
  const first = { $style: [{ opacity: 0.5 }, false, { padding: 8 }] } as const
  const native = createTokenStyles(system, { platform: 'native', tokens: {} })
  expect(native(first as never, { $style: { padding: 16 } }).style).toEqual({
    opacity: 0.5,
    padding: 16,
  })
  expect(first.$style[2].padding).toBe(8)
})
test('invalid conditional kind metadata is rejected before result getters run', () => {
  expect(() => t({ ':hover': { $kind: 'text' } } as never)).toThrow(
    'part kind is static',
  )
})
