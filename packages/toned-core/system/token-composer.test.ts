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

test('explicit composition memoises equal plain inputs and stays bounded', () => {
  let resolutions = 0
  const counted = defineSystem({
    inset: defineToken({
      values: [0, 8, 16] as const,
      resolve: (value) => {
        resolutions++
        return { padding: value }
      },
    }),
  })
  const compose = createTokenStyles(counted, {
    platform: 'web',
    tokens: {},
    useClassName: false,
  })
  const first = compose({ inset: 8, $style: { opacity: 0.5 } })
  expect({ ...first }.style).toEqual({ padding: 8, opacity: 0.5 })
  expect(resolutions).toBe(1)
  for (let i = 0; i < 100; i++) {
    const again = { ...compose({ inset: 8, $style: { opacity: 0.5 } }) }
    expect(again.style).toBe(first.style)
  }
  expect(resolutions).toBe(1)
  // Different content, order-sensitive merges and distinct numbers are
  // distinct entries.
  expect(compose({ inset: 16 }).style).toEqual({ padding: 16 })
  expect(compose({ inset: 8 }, { inset: 0 }).style).toEqual({ padding: 0 })
  expect(compose({ inset: 0 }, { inset: 8 }).style).toEqual({ padding: 8 })
  expect(compose({ $style: { opacity: Number.NaN } }).style).not.toBe(
    compose({ $style: { opacity: null as never } }).style,
  )
  // Each result keeps its own wrapper; nothing a caller adds is shared.
  const mutated = compose({
    inset: 8,
    $style: { opacity: 0.5 },
  }) as unknown as Record<string, unknown>
  mutated['extra'] = true
  expect(
    (
      compose({ inset: 8, $style: { opacity: 0.5 } }) as unknown as Record<
        string,
        unknown
      >
    )['extra'],
  ).toBeUndefined()
  // An unbounded stream of distinct inputs evicts old entries.
  for (let i = 0; i < 5000; i++) void compose({ $style: { zIndex: i } }).style
  const before = resolutions
  void compose({ inset: 8, $style: { opacity: 0.5 } }).style
  expect(resolutions).toBe(before + 1)
})
