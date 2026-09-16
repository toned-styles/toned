import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { defineSystem } from '../index.ts'
import { createWebRenderer } from '../server/index.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import {
  createGridScope,
  defineGrid,
  dp,
  fr,
  resolveGrid,
  sameGridFamily,
} from './index.ts'

const compact = () =>
  defineGrid('message', {
    columns: [fr(1)],
    areas: [['avatar'], ['title'], ['body']],
  })

test('layout variants retain ownership and every original area reference', () => {
  const base = compact()
  const wide = base.variant({
    columns: [dp(48), fr(1)],
    areas: [
      ['avatar', 'title'],
      ['.', 'body'],
    ],
  })
  expect(sameGridFamily(base, wide)).toBe(true)
  expect(sameGridFamily(base, compact())).toBe(false)
  expect(wide.area('body').placement).toEqual({
    rowStart: 2,
    rowEnd: 3,
    columnStart: 2,
    columnEnd: 3,
  })
  expect(resolveGrid(base.area('body'), 'web')).toEqual(
    resolveGrid(wide.area('body'), 'web'),
  )
  const scope = createGridScope(wide)
  const detach = scope.attach({}, base.area('body'))
  expect(scope.size).toBe(1)
  detach()
  expect(scope.size).toBe(0)
  expect(Object.isFrozen(wide)).toBe(true)
})

test('layout variants reject missing or invented areas for untyped callers too', () => {
  const base = compact()
  expect(() =>
    // @ts-expect-error a variant must preserve all assigned areas
    base.variant({ columns: [fr(1)], areas: [['avatar'], ['title']] }),
  ).toThrow('same named areas')
  expect(() =>
    base.variant({
      columns: [fr(1)],
      // @ts-expect-error a variant cannot invent an area outside the original vocabulary
      areas: [['avatar'], ['title'], ['body'], ['extra']],
    }),
  ).toThrow('same named areas')
  const owner = base.area('body').grid
  expect(() =>
    // @ts-expect-error an area's owner retains the whole family's area vocabulary
    owner.variant({ columns: [fr(1)], areas: [['body']] }),
  ).toThrow('same named areas')
})

test('media and variant layouts compile with stable area output and no runtime discovery', () => {
  const base = compact()
  const wide = base.variant({
    columns: [dp(48), fr(1)],
    areas: [
      ['avatar', 'title'],
      ['.', 'body'],
    ],
  })
  const ui = defineSystem({
    id: 'grid-variants',
    tokens: {},
    conditions: { media: { wide: 600 } },
  })
  const sheet = ui
    .stylesheet({
      Root: {
        '@platform web': { $grid: base, '@media wide': { $grid: wide } },
      },
      Body: { '@platform web': { $area: base.area('body') } },
    })
    .variants<{ expanded: boolean }>()(($) => ({
    [$.expanded(true)]: { Root: { '@platform web': { $grid: wide } } },
  }))
  const built = buildStyles(ui, { sheets: [sheet] })
  const renderer = createWebRenderer(ui, {
    tokens: {},
    manifest: built.manifest,
  })
  const first = renderer.resolve(sheet, { variants: { expanded: false } })
  const expanded = renderer.resolve(sheet, { variants: { expanded: true } })
  expect(first.Body).toEqual(expanded.Body)
  expect(first.Root.style).not.toEqual(expanded.Root.style)
  expect(JSON.stringify(first.Root.style)).toContain('a62_6f_64_79')
})

test('conditional geometry cannot silently change or invent mounted grid ownership', () => {
  const base = compact(),
    foreign = compact()
  const ui = defineSystem({
    id: 'grid-owner',
    tokens: {},
    conditions: { media: { wide: 600 } },
  })
  expect(() =>
    ui.stylesheet({
      Root: { '@platform web': { '@media wide': { $grid: base } } },
    }),
  ).toThrow('unconditional registration')
  expect(() =>
    ui.stylesheet({
      Root: {
        '@platform web': { $grid: base, '@media wide': { $grid: foreign } },
      },
    }),
  ).toThrow('same grid family')
})

test('platform refinement replaces a layout reference without cloning its family identity', () => {
  const base = compact()
  const wide = base.variant({
    columns: [dp(48), fr(1)],
    areas: [
      ['avatar', 'title'],
      ['.', 'body'],
    ],
  })
  const resolved = resolvePlatformKeys(
    { Root: { $grid: base, '@platform.web': { $grid: wide } } },
    'web',
  )
  expect(resolved.Root.$grid).toBe(wide)
  expect(sameGridFamily(resolved.Root.$grid, base)).toBe(true)
})

test('complete layouts reset an omitted gap instead of inheriting the previous plan', () => {
  const base = defineGrid('spaced', {
    columns: [fr(1)],
    areas: [['body']],
    gap: 12,
  })
  const wide = base.variant({ columns: [fr(1)], areas: [['body']] })
  expect(resolveGrid(base, 'web')['gap']).toBe(12)
  expect(resolveGrid(wide, 'web')['gap']).toBe(0)
})
