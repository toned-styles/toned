import { describe, expect, it } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createRenderer, createWebRenderer, createNativeRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { createTailwindBackend } from './index.ts'

describe('explicit output backends', () => {
  const ui = defineSystem({
    flow: defineToken({
      values: ['row', 'column'],
      resolve: value => ({ display: 'flex', flexDirection: value }),
    }),
    gap: defineToken({ values: [0, 12, 20], resolve: value => ({ gap: value }) }),
  })
  const sheet = ui.stylesheet({ Root: { flow: 'row', gap: 12 } })
  const tailwind = createTailwindBackend({
    id: 'fixed-spacing',
    mappings: [
      { field: 'display', value: 'flex', utility: 'flex' },
      { field: 'flexDirection', value: 'row', utility: 'flex-row' },
      { field: 'gap', value: 12, utility: 'gap-[12px]' },
    ],
    parameters: [
      {
        field: 'gap',
        variable: '--test-gap',
        utility: 'gap-[var(--test-gap)]',
        serialize: value => `${value}px`,
      },
    ],
  })
  it('uses the same sheet through pure web, native and utility resolution', () => {
    const artifact = buildStyles(ui, { sheets: [sheet] })
    const web = createWebRenderer(ui, { manifest: artifact.manifest, tokens: {} }).resolve(sheet)
    const native = createNativeRenderer(ui, { tokens: {} }).resolve(sheet)
    const utility = createRenderer(ui, { backend: tailwind, tokens: {} }).resolve(sheet)
    expect(web['Root']?.className).toBeTruthy()
    expect(native['Root']?.style).toEqual({ display: 'flex', flexDirection: 'row', gap: 12 })
    expect(utility['Root']).toEqual({ className: 'flex flex-row gap-[12px]', style: {} })
    expect(artifact.css).toMatch(/flex-direction:\s*row/)
  })
  it('builds complete dynamic candidates and rejects unmapped semantics', () => {
    expect(tailwind.source).toContain('@source inline("gap-[var(--test-gap)]")')
    expect(tailwind.resolve({ style: { gap: 37 } })).toEqual({
      className: 'gap-[var(--test-gap)]',
      style: { '--test-gap': '37px' },
    })
    expect(() => tailwind.resolve({ style: { fontSize: 37 } })).toThrow('no exact mapping')
    expect(() => tailwind.resolve({ style: { gap: 'var(--toned_hover)' } })).toThrow(
      'condition chains',
    )
    expect(() =>
      createTailwindBackend({
        id: 'strict',
        mappings: [],
        classesOnly: true,
        parameters: [
          { field: 'gap', variable: '--g', utility: 'gap-[var(--g)]', serialize: String },
        ],
      }),
    ).toThrow('classes-only')
  })
  it('returns immutable deterministic artifacts and refuses sheets from another system', () => {
    const before = buildStyles(ui, { sheets: [sheet] })
    expect(buildStyles(ui, { sheets: [sheet, sheet] })).toEqual(before)
    expect(Object.isFrozen(before.manifest.conditions)).toBe(true)
    const other = defineSystem({
      gap: defineToken({ values: [0], resolve: value => ({ gap: value }) }),
    })
    expect(() => createNativeRenderer(other, { tokens: {} }).resolve(sheet)).toThrow(
      'different system',
    )
  })
})

it('rejects utility aliases with different values and colliding parameter channels', () => {
  expect(() =>
    createTailwindBackend({
      id: 'ambiguous',
      mappings: [
        { field: 'opacity', value: 0.5, utility: 'opacity-50' },
        { field: 'opacity', value: 1, utility: 'opacity-50' },
      ],
    }),
  ).toThrow('distinct declarations')
  expect(() =>
    createTailwindBackend({
      id: 'shared',
      mappings: [],
      parameters: [
        { field: 'width', utility: 'w-[var(--size)]', variable: '--size', serialize: String },
        { field: 'height', utility: 'h-[var(--size)]', variable: '--size', serialize: String },
      ],
    }),
  ).toThrow('shared by multiple fields')
  expect(() =>
    createTailwindBackend({
      id: 'brace',
      mappings: [{ field: 'opacity', value: 1, utility: 'opacity-{0,100}' }],
    }),
  ).toThrow('source-safe')
})
it('native capabilities fail visibly for CSS-only fields and values', () => {
  const system = defineSystem({
    webOnly: defineToken({ values: ['grid'], resolve: () => ({ display: 'grid' }) }),
  })
  const sheet = system.stylesheet({ Root: { webOnly: 'grid' } })
  expect(() => createNativeRenderer(system, { tokens: {} }).resolve(sheet)).toThrow(
    'unsupported display',
  )
})
