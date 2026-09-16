import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { overrideSheet } from './overrideSheet.ts'

const ui = defineSystem({
  id: 'pure-overrides',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1] as const,
      resolve: (opacity) => ({ opacity }),
    }),
    width: defineToken({
      values: [4, 8] as const,
      resolve: (width) => ({ width }),
    }),
  },
})
const sheet = ui
  .stylesheet({ Root: { opacity: 0, width: 4 } })
  .variants<{ active: boolean }>()(
  ($) => ({ [$.active(true)]: { Root: { opacity: 0.5 } } }),
  { defaults: { active: true } },
)

test('pure override sheets add authoritative layers for native and CSS rendering', () => {
  const overridden = overrideSheet(sheet, { Root: { opacity: 1, width: null } })
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(native.resolve(overridden).Root.style).toEqual({ opacity: 1 })
  expect(native.resolve(sheet).Root.style).toEqual({ opacity: 0.5, width: 4 })
  const css = buildStyles(ui, { sheets: [overridden] })
  const web = createWebRenderer(ui, {
    manifest: css.manifest,
    tokens: {},
  }).resolve(overridden)
  expect(web.Root.className).not.toContain('width_4')
  expect(
    web.Root.style['opacity'] === 1 ||
      web.Root.className?.split(' ').includes('pure-overrides--opacity_1'),
  ).toBe(true)
})

test('pure override factories select existing variants and retain defaults', () => {
  const overridden = overrideSheet(sheet, {}, ($) => ({
    [$.active(true)]: { Root: { opacity: 1 } },
  }))
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(native.resolve(overridden).Root.style['opacity']).toBe(1)
  expect(
    native.resolve(overridden, { variants: { active: false } }).Root.style[
      'opacity'
    ],
  ).toBe(0)
})
