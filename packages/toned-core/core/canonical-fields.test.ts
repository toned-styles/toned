import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { resolvePortableFields } from './values.ts'

const canonical = { platform: 'native', canonicalFields: true } as const
const sides = (value: number) => ({
  paddingTop: value,
  paddingRight: value,
  paddingBottom: value,
  paddingLeft: value,
})

test('descriptor logical and physical shorthands resolve in source order', () => {
  const ui = defineSystem({
    id: 'canonical-fields',
    tokens: {
      edge: defineToken({
        values: [true],
        resolve: () => ({ paddingInlineStart: 8 }),
      }),
      all: defineToken({ values: [true], resolve: () => ({ padding: 3 }) }),
    },
  })
  const lastAll = ui.stylesheet({ Root: { edge: true, all: true } })
  const lastEdge = ui.stylesheet({ Root: { all: true, edge: true } })
  const renderer = createNativeRenderer(ui, { tokens: {} })
  expect(renderer.resolve(lastAll).Root.style).toEqual(sides(3))
  expect(renderer.resolve(lastEdge).Root.style).toEqual({
    ...sides(3),
    paddingLeft: 8,
  })
  const css = buildStyles(ui, { sheets: [lastAll, lastEdge] }).css
  expect(css).toContain('padding-top:3px')
  expect(css).toContain('padding-right:3px')
  expect(css).not.toMatch(/\{padding:3px/)
})

test('one token output shares the same canonical shorthand precedence', () => {
  expect(
    resolvePortableFields({ paddingInlineStart: 8, padding: 3 }, {}, canonical),
  ).toEqual(sides(3))
  expect(
    resolvePortableFields(
      { borderLeftWidth: 8, borderWidth: 3 },
      {},
      canonical,
    ),
  ).toEqual({
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  })
  expect(resolvePortableFields({ left: 8, inset: 3 }, {}, canonical)).toEqual({
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
  })
  expect(
    resolvePortableFields({ borderStyle: 'solid' }, {}, canonical),
  ).toEqual({ borderStyle: 'solid' })
  expect(
    resolvePortableFields(
      { padding: 3 },
      {},
      { ...canonical, writingMode: 'vertical-rl' },
    ),
  ).toEqual(sides(3))
})

test('CSS shorthand expansion respects component counts and function spaces', () => {
  expect(
    resolvePortableFields(
      { margin: '1px 2px 3px' },
      {},
      { ...canonical, platform: 'web' },
    ),
  ).toEqual({
    marginTop: '1px',
    marginRight: '2px',
    marginBottom: '3px',
    marginLeft: '2px',
  })
  expect(
    resolvePortableFields(
      { paddingInline: 'calc(1px + 2px) var(--pad, 4px)' },
      {},
      { ...canonical, platform: 'web', direction: 'rtl' },
    ),
  ).toEqual({ paddingRight: 'calc(1px + 2px)', paddingLeft: 'var(--pad, 4px)' })
  expect(() =>
    resolvePortableFields(
      { paddingInline: '1px 2px 3px' },
      {},
      { ...canonical, platform: 'web' },
    ),
  ).toThrow('one to 2')
})

test('legacy physical shorthand serialization stays compatible', () => {
  expect(
    resolvePortableFields(
      { paddingInlineStart: 8, padding: 3 },
      {},
      { platform: 'native' },
    ),
  ).toEqual({ paddingLeft: 8, padding: 3 })
})
