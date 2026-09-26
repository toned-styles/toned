import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import type { Variants } from '../types/index.ts'

test('annotated callbacks preserve defaults and resolution across renderers', () => {
  const ui = defineSystem({
    id: 'annotated-runtime',
    tokens: {
      opacity: defineToken({
        values: [0, 0.5, 1],
        resolve: (opacity) => ({ opacity }),
      }),
    },
  })
  const base = ui.stylesheet({ Root: { opacity: 0 } })
  type Mods = { active: boolean }
  const factory = ($: Variants<Mods>) => ({
    [$.active(true)]: { Root: { opacity: 1 as const } },
    [$.active(false)]: { Root: { opacity: 0.5 as const } },
  })
  const sheet = base.variants(factory, { defaults: { active: true } })
  const legacy = base.variants<Mods>(factory)
  const artifact = buildStyles(ui, { sheets: [sheet, legacy] })
  const native = createNativeRenderer(ui, { tokens: {} })
  const web = createWebRenderer(ui, { tokens: {}, manifest: artifact.manifest })
  for (const variants of [
    {},
    { active: undefined },
    { active: false },
    { active: true },
  ]) {
    expect(native.resolve(sheet, { variants }).Root.style).toEqual({
      opacity: variants.active === false ? 0.5 : 1,
    })
    expect(web.resolve(sheet, { variants }).Root).toEqual(
      web.resolve(legacy, { variants: { active: variants.active ?? true } })
        .Root,
    )
  }
  expect(native.resolve(base).Root.style).toEqual({ opacity: 0 })
  expect(
    native.resolve(sheet.extend({ Root: { opacity: 0.5 } })).Root.style,
  ).toEqual({ opacity: 1 })
})
