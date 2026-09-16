import { describe, expect, it } from 'vitest'
import { buildStyles, buildTailwind } from '../build/index.ts'
import {
  createNativeRenderer,
  createRenderer,
  createWebRenderer,
} from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { createTailwindBackend } from './index.ts'

describe('explicit output backends', () => {
  const ui = defineSystem({
    flow: defineToken({
      values: ['row', 'column'],
      resolve: (value) => ({ display: 'flex', flexDirection: value }),
    }),
    gap: defineToken({
      values: [0, 12, 20],
      resolve: (value) => ({ gap: value }),
    }),
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
        serialize: (value) => `${value}px`,
      },
    ],
  })
  it('uses the same sheet through pure web, native and utility resolution', async () => {
    const artifact = buildStyles(ui, { sheets: [sheet] })
    const web = createWebRenderer(ui, {
      manifest: artifact.manifest,
      tokens: {},
    }).resolve(sheet)
    const native = createNativeRenderer(ui, { tokens: {} }).resolve(sheet)
    const declarations: Record<string, string> = {
      flex: 'display:flex',
      'flex-row': 'flex-direction:row',
      'gap-[12px]': 'gap:12px',
      'gap-[var(--test-gap)]': 'gap:var(--test-gap)',
    }
    const built = await buildTailwind(ui, tailwind, {
      sheets: [sheet],
      tokens: {},
      source: '',
      compile: async (source) => ({
        build: (candidates) => {
          const utility = source.match(/@apply ([^;]+);/)?.[1]
          if (utility) return `.toned_mapping_probe {${declarations[utility]}}`
          return candidates
            .map(
              (candidate) =>
                `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (value) => `\\${value}`)} {${declarations[candidate]}}`,
            )
            .join('\n')
        },
      }),
    })
    const utility = createRenderer(ui, {
      backend: built.backend,
      tokens: {},
    }).resolve(sheet)
    expect(web['Root']?.className).toBeTruthy()
    expect(native['Root']?.style).toEqual({
      display: 'flex',
      flexDirection: 'row',
      gap: 12,
    })
    expect(utility['Root']?.className?.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'flex-row', 'gap-[12px]']),
    )
    expect(utility['Root']?.style).toEqual({})
    expect(() =>
      createRenderer(ui, {
        backend: tailwind,
        tokens: {},
        manifest: artifact.manifest,
      }),
    ).toThrow('requires a validated build artifact')
    expect(artifact.css).toMatch(/flex-direction:\s*row/)
  })
  it('builds complete dynamic candidates and rejects unmapped semantics', () => {
    expect(tailwind.source).toContain('@source inline("gap-[var(--test-gap)]")')
    expect(tailwind.resolve({ style: { gap: 37 } })).toEqual({
      className: 'gap-[var(--test-gap)]',
      style: { '--test-gap': '37px' },
    })
    expect(() => tailwind.resolve({ style: { fontSize: 37 } })).toThrow(
      'no exact mapping',
    )
    expect(() =>
      tailwind.resolve({ style: { gap: 'var(--toned_hover)' } }),
    ).toThrow('condition chains')
    expect(() =>
      createTailwindBackend({
        id: 'strict',
        mappings: [],
        classesOnly: true,
        parameters: [
          {
            field: 'gap',
            variable: '--g',
            utility: 'gap-[var(--g)]',
            serialize: String,
          },
        ],
      }),
    ).toThrow('classes-only')
  })
  it('returns immutable deterministic artifacts and refuses sheets from another system', () => {
    const before = buildStyles(ui, { sheets: [sheet] })
    expect(buildStyles(ui, { sheets: [sheet, sheet] })).toEqual(before)
    expect(Object.isFrozen(before.manifest.conditions)).toBe(true)
    const other = defineSystem({
      gap: defineToken({ values: [0], resolve: (value) => ({ gap: value }) }),
    })
    expect(() =>
      createNativeRenderer(other, { tokens: {} }).resolve(sheet),
    ).toThrow('different system')
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
        {
          field: 'width',
          utility: 'w-[var(--size)]',
          variable: '--size',
          serialize: String,
        },
        {
          field: 'height',
          utility: 'h-[var(--size)]',
          variable: '--size',
          serialize: String,
        },
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
    webOnly: defineToken({
      values: ['grid'],
      resolve: () => ({ display: 'grid' }),
    }),
  })
  const sheet = system.stylesheet({ Root: { webOnly: 'grid' } })
  expect(() =>
    createNativeRenderer(system, { tokens: {} }).resolve(sheet),
  ).toThrow('unsupported display')
})

it('native validation rejects CSS units, invalid transforms and nested CSS expressions', async () => {
  const { nativeBackend } = await import('./native.ts')
  expect(() =>
    nativeBackend.resolve({ style: { paddingLeft: '2rem' } }),
  ).toThrow('logical numbers')
  expect(() =>
    nativeBackend.resolve({ style: { opacity: Number.NaN } }),
  ).toThrow('finite')
  expect(() =>
    nativeBackend.resolve({
      style: { transform: [{ translateX: 'var(--x)' }] },
    }),
  ).toThrow('transform')
  expect(() =>
    nativeBackend.resolve({
      style: { shadowOffset: { width: 'calc(1px)', height: 0 } },
    }),
  ).toThrow('CSS-only')
  expect(
    nativeBackend.resolve({
      style: {
        width: '50%',
        marginLeft: 'auto',
        transform: [{ translateX: 2 }, { rotate: '45deg' }],
      },
    }).style,
  ).toEqual({
    width: '50%',
    marginLeft: 'auto',
    transform: [{ translateX: 2 }, { rotate: '45deg' }],
  })
})

it('native color capability rejects browser color functions while retaining native color forms', async () => {
  const { nativeBackend } = await import('./native.ts')
  for (const color of [
    'color-mix(in srgb, red, blue)',
    'oklch(50% 0.2 30)',
    'OKLAB(0.5 0.2 0.1)',
    'lab(50% 20 10)',
    'lch(50% 20 30)',
    'color(display-p3 1 0 0)',
    'light-dark(white, black)',
    'rgba(from red r g b / 0.5)',
    'hwb(from red h w b)',
  ]) {
    expect(() => nativeBackend.resolve({ style: { color } })).toThrow(
      'CSS-only',
    )
  }
  for (const color of [
    'red',
    '#ff0000',
    0xff0000ff,
    'rgb(255 0 0)',
    'rgba(255, 0, 0, 0.5)',
    'hsl(0 100% 50%)',
    'hwb(0 0% 0%)',
  ]) {
    expect(nativeBackend.resolve({ style: { color } }).style['color']).toBe(
      color,
    )
  }
})

it('native numeric fields reject CSS unit strings before reaching a renderer', async () => {
  const { nativeBackend } = await import('./native.ts')
  const fields = [
    'fontSize',
    'borderRadius',
    'borderWidth',
    'lineHeight',
    'letterSpacing',
    'elevation',
    'shadowOpacity',
    'shadowRadius',
    'opacity',
    'flex',
    'flexGrow',
    'flexShrink',
    'zIndex',
    'aspectRatio',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderRightWidth',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderTopWidth',
    'borderStartWidth',
    'borderEndWidth',
  ]
  for (const field of fields) {
    for (const value of ['12px', '1rem', '1.5em', '2vh', '25%'])
      expect(() =>
        nativeBackend.resolve({ style: { [field]: value } }),
      ).toThrow(`${field} requires a finite number`)
    expect(nativeBackend.resolve({ style: { [field]: 2 } }).style[field]).toBe(
      2,
    )
  }
  expect(() =>
    nativeBackend.resolve({ style: { fontWeight: '200px' } }),
  ).toThrow('fontWeight')
  expect(
    nativeBackend.resolve({ style: { fontWeight: '200' } }).style['fontWeight'],
  ).toBe('200')
  expect(() =>
    nativeBackend.resolve({
      style: { shadowOffset: { width: '1px', height: 2 } },
    }),
  ).toThrow('shadowOffset.width')
  expect(
    nativeBackend.resolve({
      style: {
        width: '25%',
        marginLeft: 'auto',
        transform: [{ rotate: '45deg' }],
      },
    }).style,
  ).toEqual({
    width: '25%',
    marginLeft: 'auto',
    transform: [{ rotate: '45deg' }],
  })
})
