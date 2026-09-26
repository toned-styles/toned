import { expect, test, vi } from 'vitest'
import { cssVariablesBackend } from '../backends/index.ts'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createRenderer } from '../server/index.ts'
import { defineSystem } from '../system/definers.ts'
import type { Variants } from '../types/stylesheet.ts'
import {
  type AdaptiveLayoutName,
  createAdaptiveStore,
  defineAdaptiveLayout,
} from './index.ts'

const layout = defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Title', 'Body', 'Actions'],
  fallback: 'stack',
  hysteresis: { size: 20 },
  layouts: {
    stack: { flow: 'stack', gap: 8 },
    wide: {
      flow: 'row',
      gap: 12,
      when: { minWidth: 600, maxTextScale: 1.5 },
      areas: { Body: { grow: 1 } },
    },
    keyboard: { flow: 'wrap', when: { keyboard: 'shown' } },
  },
})
const input = (width: number) => ({
  container: { width, height: 400 },
  textScale: 1,
})

test('declaration priority excludes fallback and missing inputs do not guess', () => {
  expect(layout.select({ viewport: { width: 1000, height: 1000 } })).toBe(
    'stack',
  )
  expect(layout.select({ container: { width: 1000, height: 1000 } })).toBe(
    'stack',
  )
  expect(layout.select(input(600))).toBe('wide')
  expect(layout.select({ ...input(800), keyboardHeight: 100 })).toBe('wide')
  expect(layout.select({ ...input(400), keyboardHeight: 100 })).toBe('keyboard')
  expect(layout.select({ ...input(800), textScale: 2 })).toBe('stack')
})

test('entry and exit hysteresis resist alternating measurements at the breakpoint', () => {
  const store = createAdaptiveStore(layout, input(400))
  const changed = vi.fn()
  const stop = store.subscribe(changed)
  for (const width of [599, 601, 619, 599]) store.update(input(width))
  expect(store.getSnapshot()).toEqual({ layout: 'stack' })
  expect(changed).not.toHaveBeenCalled()
  store.update(input(620))
  expect(store.getSnapshot()).toEqual({ layout: 'wide' })
  for (const width of [601, 599, 580]) store.update(input(width))
  expect(store.getSnapshot()).toEqual({ layout: 'wide' })
  expect(changed).toHaveBeenCalledTimes(1)
  store.update(input(579))
  expect(store.getSnapshot()).toEqual({ layout: 'stack' })
  expect(changed).toHaveBeenCalledTimes(2)
  stop()
  store.update(input(900))
  expect(changed).toHaveBeenCalledTimes(2)
})

test('higher priority candidate can replace a retained candidate, and insets constrain usable space', () => {
  expect(
    layout.select({ ...input(630), safeArea: { left: 20, right: 20 } }),
  ).toBe('stack')
  expect(layout.select({ ...input(640), keyboardHeight: 50 }, 'keyboard')).toBe(
    'wide',
  )
  const viewport = defineAdaptiveLayout({
    axis: 'layout',
    root: 'Root',
    areas: [],
    fallback: 'stack',
    space: 'viewport',
    layouts: {
      stack: { flow: 'stack' },
      tall: { flow: 'row', when: { minHeight: 500, keyboard: 'hidden' } },
    },
  })
  expect(
    viewport.select({
      viewport: { width: 600, height: 600 },
      keyboardHeight: 0,
      safeArea: { top: 100 },
    }),
  ).toBe('tall')
  expect(
    viewport.select({
      viewport: { width: 600, height: 600 },
      keyboardHeight: 150,
    }),
  ).toBe('stack')
  expect(
    viewport.select({
      viewport: { width: 600, height: 600 },
      keyboardHeight: 0,
      safeArea: { bottom: 101 },
    }),
  ).toBe('stack')
})

test('intrinsic fits computes rows and wrapping in source order without self measurement', () => {
  const fit = defineAdaptiveLayout({
    axis: 'layout',
    root: 'Root',
    areas: ['First', 'Second', 'Third'],
    fallback: 'stack',
    layouts: {
      stack: { flow: 'stack' },
      row: { flow: 'row', gap: 10, when: { content: 'fits' } },
      wrap: { flow: 'wrap', gap: 10, when: { content: 'fits' } },
    },
  })
  const content = {
    First: { width: 100, height: 20 },
    Second: { width: 100, height: 30 },
    Third: { width: 100, height: 40 },
  }
  expect(fit.select({ container: { width: 320, height: 40 }, content })).toBe(
    'row',
  )
  expect(fit.select({ container: { width: 210, height: 80 }, content })).toBe(
    'wrap',
  )
  expect(fit.select({ container: { width: 210, height: 79 }, content })).toBe(
    'stack',
  )
  expect(fit.select({ container: { width: 99, height: 1000 }, content })).toBe(
    'stack',
  )
  expect(
    fit.select({
      container: { width: 1000, height: 1000 },
      content: { First: content.First },
    }),
  ).toBe('stack')
  expect(fit.areas).toEqual(['First', 'Second', 'Third'])
})

test('store snapshots are immutable, stable for equal selected layouts, and deterministic on the server', () => {
  const initial = input(900)
  const store = createAdaptiveStore(layout, initial)
  initial.container.width = 10
  expect(store.getMeasurements().container?.width).toBe(900)
  expect(store.getServerSnapshot()).toBe(layout.variants('stack'))
  const current = store.getSnapshot()
  const changed = vi.fn()
  store.subscribe(changed)
  store.update(input(850))
  store.update(input(850))
  expect(store.getSnapshot()).toBe(current)
  expect(changed).not.toHaveBeenCalled()
  expect(Object.isFrozen(store.getMeasurements().container)).toBe(true)
  store.update({ container: undefined })
  expect(store.getSnapshot()).toBe(store.getServerSnapshot())
  expect(changed).toHaveBeenCalledTimes(1)
})

test('rules integrate with the ordinary variant compiler and resolve portable styles on both hosts', () => {
  const ui = defineSystem({ id: 'adaptive-example', tokens: {} })
  const sheet = ui
    .stylesheet({ Root: {}, Title: { $kind: 'text' }, Body: {}, Actions: {} })
    .variants(
      ($: Variants<{ layout: AdaptiveLayoutName<typeof layout> }>) =>
        layout.rules($),
      { defaults: { layout: layout.fallback } },
    )
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(native.resolve(sheet).Root.style).toMatchObject({
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  })
  const nativeWide = native.resolve(sheet, {
    variants: layout.variants('wide'),
  })
  expect(nativeWide.Root.style).toMatchObject({
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12,
  })
  expect(nativeWide.Body.style).toMatchObject({ flexGrow: 1 })
  const artifact = buildStyles(ui, { sheets: [sheet] })
  const web = createRenderer(ui, {
    tokens: {},
    backend: cssVariablesBackend,
    manifest: artifact.manifest,
  })
  expect(
    web.resolve(sheet, { variants: layout.variants('wide') }).Root.style,
  ).toMatchObject(nativeWide.Root.style)
  expect(
    native.resolve(sheet, { variants: layout.variants('keyboard') }).Root.style,
  ).toMatchObject({ flexWrap: 'wrap' })
})

const unchecked = defineAdaptiveLayout as (definition: any) => unknown
const valid = {
  axis: 'layout',
  root: 'Root',
  areas: ['Body'],
  fallback: 'stack',
  layouts: { stack: { flow: 'stack' } },
}
test.each([
  [{ axis: 'constructor' }, 'axis'],
  [{ areas: ['Root'] }, 'distinct'],
  [{ areas: ['Body', 'Body'] }, 'distinct'],
  [
    { areas: Array.from({ length: 129 }, (_, index) => `Area${index}`) },
    'at most',
  ],
  [{ fallback: 'missing' }, 'fallback'],
  [{ layouts: {} }, 'between'],
  [
    {
      layouts: Object.fromEntries(
        Array.from({ length: 33 }, (_, index) => [
          `L${index}`,
          { flow: 'row' },
        ]),
      ),
    },
    'between',
  ],
  [{ layouts: { stack: { flow: 'grid' } } }, 'flow'],
  [{ layouts: { stack: { flow: 'stack', gap: Infinity } } }, 'finite'],
  [
    { layouts: { stack: { flow: 'stack', when: { minWidth: 1 } } } },
    'unconditional',
  ],
  [
    {
      layouts: {
        stack: { flow: 'stack' },
        row: { flow: 'row', when: { minWidth: 10, maxWidth: 5 } },
      },
    },
    'reversed',
  ],
  [
    { layouts: { stack: { flow: 'stack', areas: { Missing: {} } } } },
    'unknown layout area',
  ],
  [
    { layouts: { stack: { flow: 'stack', areas: { Body: { order: 2 } } } } },
    'unknown area property',
  ],
  [
    { layouts: { stack: { flow: 'stack', order: 2 } } },
    'unknown layout property',
  ],
  [{ hysteresis: { size: -1 } }, 'nonnegative'],
])('rejects invalid declarations %#', (patch, message) => {
  expect(() => unchecked({ ...valid, ...patch })).toThrow(message)
})

test('invalid inputs fail without publishing partial state', () => {
  const store = createAdaptiveStore(layout, input(900))
  const current = store.getMeasurements()
  expect(() => store.update({ container: { width: NaN, height: 10 } })).toThrow(
    'finite',
  )
  expect(() => layout.select({ textScale: 0 })).toThrow('positive')
  expect(() =>
    layout.select({ content: { Missing: { width: 1, height: 1 } } } as any),
  ).toThrow('unknown content area')
  expect(() => layout.select({ safeArea: { middle: 1 } } as any)).toThrow(
    'unknown safe-area edge',
  )
  expect(store.getMeasurements()).toBe(current)
})

test('intrinsic fit accounts for explicit bases and zero-width areas still consume gaps', () => {
  const fit = defineAdaptiveLayout({
    axis: 'layout',
    root: 'Root',
    areas: ['A', 'B'],
    fallback: 'stack',
    layouts: {
      stack: { flow: 'stack' },
      row: {
        flow: 'row',
        when: { content: 'fits' },
        areas: { A: { basis: 100 } },
      },
    },
  })
  const content = { A: { width: 10, height: 10 }, B: { width: 20, height: 10 } }
  expect(fit.select({ container: { width: 119, height: 20 }, content })).toBe(
    'stack',
  )
  expect(fit.select({ container: { width: 120, height: 20 }, content })).toBe(
    'row',
  )
  const zero = defineAdaptiveLayout({
    axis: 'layout',
    root: 'Root',
    areas: ['A', 'B'],
    fallback: 'stack',
    layouts: {
      stack: { flow: 'stack' },
      wrap: { flow: 'wrap', gap: 10, when: { content: 'fits' } },
    },
  })
  expect(
    zero.select({
      container: { width: 10, height: 10 },
      content: { A: { width: 0, height: 10 }, B: { width: 10, height: 10 } },
    }),
  ).toBe('stack')
})

test('text-scale hysteresis uses its own unit and definitions do not remain live', () => {
  const definition = {
    axis: 'layout',
    root: 'Root',
    areas: ['Body'],
    fallback: 'stack' as const,
    hysteresis: { textScale: 0.1 },
    layouts: {
      stack: { flow: 'stack' as const },
      row: { flow: 'row' as const, when: { maxTextScale: 1.5 } },
    },
  }
  const model = defineAdaptiveLayout(definition)
  definition.axis = 'changed'
  definition.layouts.row.when.maxTextScale = 5
  expect(model.axis).toBe('layout')
  expect(model.select({ ...input(800), textScale: 1.45 }, 'stack')).toBe(
    'stack',
  )
  expect(model.select({ ...input(800), textScale: 1.4 }, 'stack')).toBe('row')
  expect(model.select({ ...input(800), textScale: 1.6 }, 'row')).toBe('row')
  expect(model.select({ ...input(800), textScale: 1.61 }, 'row')).toBe('stack')
})
