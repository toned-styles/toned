import type { Variants } from '../types/index.ts'
import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { defineSystem } from '../index.ts'
import { createWebRenderer } from '../server/index.ts'
import { overrideSheet } from '../stylesheet/overrideSheet.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import {
  createGridScope,
  defineGrid,
  dp,
  fr,
  resolveGrid,
  sameGridFamily,
} from './index.ts'
import { gridRegistrations } from './validation.ts'

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
    .variants(($: Variants<{ expanded: boolean }>) => ({
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

test('grid and area null overrides remove generated geometry before materialization', () => {
  const grid = compact()
  const ui = defineSystem({ id: 'removed-grid', tokens: {} })
  const base = ui.stylesheet({
    Root: { '@platform web': { $grid: grid } },
    Body: { '@platform web': { $area: grid.area('body') } },
  })
  const removed = overrideSheet(base, {
    Root: { '@platform web': { $grid: null } },
    Body: { '@platform web': { $area: null } },
  })
  const built = buildStyles(ui, { sheets: [removed] })
  const output = createWebRenderer(ui, {
    tokens: {},
    manifest: built.manifest,
  }).resolve(removed)
  expect(output.Root.style).toEqual({})
  expect(output.Body.style).toEqual({})
  expect(buildStyles(ui, { sheets: [base] }).css).toBeTruthy()
})

test('authoritative layers may add unconditional grid registrations and replace them together', () => {
  const first = compact(),
    second = compact()
  const ui = defineSystem({ id: 'layered-grid', tokens: {} })
  const base = ui.stylesheet({
    Root: { '@platform web': { $grid: first } },
    Body: {},
  })
  const added = overrideSheet(base, {
    Body: { '@platform web': { $area: first.area('body') } },
  })
  expect(() => buildStyles(ui, { sheets: [added] })).not.toThrow()
  const replaced = overrideSheet(added, {
    Root: { '@platform web': { $grid: second } },
    Body: { '@platform web': { $area: second.area('body') } },
  })
  expect(() => buildStyles(ui, { sheets: [replaced] })).not.toThrow()
  const rules = resolvePlatformKeys(getStylesheetPlan(added).rules, 'web')
  const effective = gridRegistrations(rules)
  expect((effective['Body']!['$area'] as { grid: unknown }).grid).toBe(first)
})

test('removing a grid registration cannot leave its conditional layout behind', () => {
  const first = compact()
  const wide = first.variant({
    columns: [dp(48), fr(1)],
    areas: [
      ['avatar', 'title'],
      ['.', 'body'],
    ],
  })
  const ui = defineSystem({
    id: 'missing-grid-owner',
    tokens: {},
    conditions: { media: { wide: 600 } },
  })
  const base = ui.stylesheet({
    Root: { '@platform web': { $grid: first, '@media wide': { $grid: wide } } },
  })
  expect(() =>
    overrideSheet(base, { Root: { '@platform web': { $grid: null } } }),
  ).toThrow('unconditional registration')
})
