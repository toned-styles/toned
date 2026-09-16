import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import {
  dp,
  logicalFields,
  percent,
  resolvePortableFields,
  rgba,
  themeRef,
} from './values.ts'

test('structured values and logical writes resolve before backend field precedence', () => {
  const theme = themeRef<{ space: number; accent: string }>()
  const ui = defineSystem({
    id: 'logical-values',
    layout: { direction: 'rtl', writingMode: 'horizontal-tb' },
    tokens: {
      layout: defineToken({
        values: [true],
        resolve: () => ({
          paddingInline: dp(8),
          width: percent(50),
          backgroundColor: rgba(20, 40, 60, 0.5),
        }),
      }),
      edge: defineToken({
        values: [true],
        resolve: () => ({ paddingInlineStart: theme('space') }),
      }),
      physical: defineToken({
        values: [true],
        resolve: () => ({ paddingRight: 3 }),
      }),
    },
  })
  const sheet = ui.stylesheet({
    Root: { layout: true, edge: true, physical: true },
  })
  expect(
    createNativeRenderer(ui, { tokens: { space: 12, accent: '#fff' } }).resolve(
      sheet,
    ).Root.style,
  ).toEqual({
    paddingLeft: 8,
    paddingRight: 3,
    width: '50%',
    backgroundColor: 'rgba(20, 40, 60, 0.5)',
  })
  const artifact = buildStyles(ui, { sheets: [sheet] })
  expect(artifact.css).toContain('padding-left:8px')
  expect(artifact.css).toContain('padding-right:var(--logical-values-space)')
  expect(artifact.css).not.toContain('[object Object]')
})

test('writing-mode mappings are explicit and native refuses unsupported vertical logical layout', () => {
  expect(
    logicalFields('paddingInlineStart', {
      direction: 'rtl',
      writingMode: 'vertical-rl',
    }),
  ).toEqual(['paddingBottom'])
  expect(
    logicalFields('paddingBlockStart', { writingMode: 'vertical-rl' }),
  ).toEqual(['paddingRight'])
  expect(
    logicalFields('paddingBlockStart', { writingMode: 'vertical-lr' }),
  ).toEqual(['paddingLeft'])
  expect(
    logicalFields('minInlineSize', { writingMode: 'vertical-lr' }),
  ).toEqual(['minHeight'])
  expect(() =>
    resolvePortableFields(
      { paddingInline: dp(2) },
      {},
      { platform: 'native', writingMode: 'vertical-rl' },
    ),
  ).toThrow('writing-mode support')
})

test('theme references are checked, resolve recursively, and cannot loop', () => {
  const ref = themeRef<{ primary: unknown; secondary: unknown }>()
  expect(
    resolvePortableFields(
      { color: ref('primary') },
      { primary: ref('secondary'), secondary: rgba(255, 0, 0) },
      { platform: 'native' },
    ),
  ).toEqual({ color: 'rgba(255, 0, 0, 1)' })
  expect(() =>
    resolvePortableFields({ color: ref('primary') }, {}, { platform: 'web' }),
  ).toThrow('missing theme')
  expect(() =>
    resolvePortableFields(
      { color: ref('primary') },
      { primary: ref('primary') },
      { platform: 'native' },
    ),
  ).toThrow('cyclic theme')
  expect(() =>
    resolvePortableFields(
      { color: themeRef<{ toString: string }>()('toString') },
      {},
      { platform: 'native' },
    ),
  ).toThrow('missing theme')
  expect(() => rgba(256, 0, 0)).toThrow('[0, 255]')
  expect(() => percent(Number.NaN)).toThrow('finite')
})

test('dp thresholds normalize once to the same fixed literals in every condition channel', () => {
  const ui = defineSystem({
    id: 'logical-thresholds',
    tokens: {},
    conditions: {
      media: { wide: dp(600) },
      containers: { card: { wide: dp(300) } },
    },
  })
  expect(ui.system).toMatchObject({
    breakpoints: { __breakpoints: { wide: 600 } },
  })
  expect(ui.system.containers).toEqual({ card: { wide: '300px' } })
  const artifact = buildStyles(ui, { sheets: [] })
  expect(artifact.css).toContain('(min-width: 600px)')
  expect(artifact.css).toContain('(min-width: 300px)')
  const invalid = {
    id: 'bad-threshold',
    tokens: {},
    conditions: { media: { wide: percent(50) } },
  }
  expect(() => {
    // @ts-expect-error percentage thresholds are not fixed logical lengths
    defineSystem(invalid)
  }).toThrow('fixed nonnegative')
})
