import type { Variants } from '../types/index.ts'
import { expect, it } from 'vitest'
import { buildTailwind, compileTailwindProfile } from '../build/tailwind.ts'
import { compilePlan, resolvePlan } from '../core/plan.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { createTailwindBackend } from './tailwind.ts'
import { compileTailwindPlan } from './tailwind-plan.ts'
import { createTailwindRuntime } from './tailwind-runtime.ts'

const ui = defineSystem({
  id: 'utility-test',
  tokens: {
    opacity: defineToken({
      values: [0, 1],
      resolve: (opacity) => ({ opacity }),
    }),
  },
  conditions: { media: { wide: 768 } },
})
const profile = createTailwindBackend({
  id: 'opacity-profile',
  mappings: [{ field: 'opacity', value: 1, utility: 'opacity-[1]' }],
  parameters: [
    {
      field: 'opacity',
      utility: 'opacity-[var(--opacity)]',
      variable: '--opacity',
      serialize: String,
    },
  ],
})
const all = (sheet: object) =>
  Object.values(
    resolvePlan(compilePlan(ui, sheet, 'web'), ui, {}, {}, { evaluate: false }),
  ).flat()

it('rejects missing conditional channels at build time, including an inactive variant', () => {
  const sheet = ui
    .stylesheet({ Root: { opacity: 1 } })
    .variants(($: Variants<{ active: boolean }>) => ({
      [$.active(true)]: { Root: { '@wide': { opacity: 0 } } },
    }))
  const strict = createTailwindBackend({
    id: 'strict',
    classesOnly: true,
    mappings: [
      { field: 'opacity', value: 0, utility: 'opacity-[0]' },
      { field: 'opacity', value: 1, utility: 'opacity-[1]' },
    ],
  })
  expect(() => compileTailwindPlan(strict, ui, all(sheet))).toThrow(
    'conditional opacity requires',
  )
})

it('rejects an uncollected sheet and keeps build-bound output immutable', () => {
  const sheet = ui.stylesheet({ Root: { opacity: 1 } })
  const missing = ui.stylesheet({ Root: { opacity: 0 } })
  const backend = compileTailwindPlan(profile, ui, all(sheet))
  expect(() =>
    backend.resolvePlan(all(missing), { system: ui, part: 'Root' }),
  ).toThrow('absent from build inventory')
  const output = backend.resolvePlan(all(sheet), { system: ui, part: 'Root' })
  expect(Object.isFrozen(output)).toBe(true)
  expect(Object.isFrozen(output.style)).toBe(true)
})

it('checks all declared themes before calling the compiler', async () => {
  const themed = defineSystem({
    id: 'themed-utility',
    tokens: {
      paint: defineToken({
        values: ['accent'],
        resolve: (_value, tokens) => ({ color: tokens['accent'] }),
      }),
    },
    themes: { dark: { accent: 'blue' } },
  })
  const finite = createTailwindBackend({
    id: 'red-only',
    mappings: [{ field: 'color', value: 'red', utility: 'text-[red]' }],
  })
  await expect(
    buildTailwind(themed, finite, {
      sheets: [themed.stylesheet({ Root: { paint: 'accent' } })],
      tokens: { accent: 'red' },
      source: '@tailwind utilities;',
      compile: async () => {
        throw new Error('compiler must not run')
      },
    }),
  ).rejects.toThrow('no exact mapping for color=blue')
})

it('validates compiled meaning and final candidate delivery independently', async () => {
  const finite = createTailwindBackend({
    id: 'opacity',
    mappings: [{ field: 'opacity', value: 1, utility: 'opacity-[1]' }],
  })
  await expect(
    compileTailwindProfile(finite, {
      source: '',
      compile: async () => ({
        build: () => '.toned_mapping_probe { opacity: 0; }',
      }),
    }),
  ).rejects.toThrow('does not mean')
  await expect(
    compileTailwindProfile(finite, {
      source: '',
      compile: async () => ({
        build: () => '.toned_mapping_probe { opacity: 1; color: red; }',
      }),
    }),
  ).rejects.toThrow('must write only opacity')
  await expect(
    compileTailwindProfile(finite, {
      source: '',
      compile: async (source) => ({
        build: () =>
          source.includes('@apply')
            ? '.toned_mapping_probe { opacity: 1; }'
            : '/* no utilities */',
      }),
    }),
  ).rejects.toThrow('missing compiled candidate')
})

it('reconstructs an immutable runtime from JSON and rejects a mismatched profile', async () => {
  const finite = createTailwindBackend({
    id: 'opacity',
    mappings: [{ field: 'opacity', value: 1, utility: 'opacity-[1]' }],
  })
  const sheet = ui.stylesheet({ Root: { opacity: 1 } })
  const artifact = await buildTailwind(ui, finite, {
    sheets: [sheet],
    tokens: {},
    source: '',
    compile: async (source) => ({
      build: () =>
        source.includes('@apply')
          ? '.toned_mapping_probe {opacity:1}'
          : '.opacity-\\[1\\] {opacity:1}',
    }),
  })
  const manifest = JSON.parse(JSON.stringify(artifact.manifest))
  const backend = createTailwindRuntime(ui, finite, manifest)
  manifest.operations.length = 0
  expect(
    backend.resolvePlan(all(sheet), { system: ui, part: 'Root' }).className,
  ).toContain('opacity-[1]')
  expect(() => createTailwindRuntime(ui, profile, artifact.manifest)).toThrow(
    'profile mismatch',
  )
})

it('rejects parameter serializers that change the normalized field meaning', () => {
  const wrong = createTailwindBackend({
    id: 'wrong-unit',
    mappings: [],
    parameters: [
      {
        field: 'gap',
        utility: 'gap-[var(--gap)]',
        variable: '--gap',
        serialize: (value) => `${value}rem`,
      },
    ],
  })
  expect(() => wrong.resolve({ style: { gap: 12 } })).toThrow(
    'parameter serializer changes gap=12px to 12rem',
  )
})

it('does not accept class names mentioned only inside comments or strings as delivered CSS', async () => {
  const finite = createTailwindBackend({
    id: 'flex',
    mappings: [{ field: 'display', value: 'flex', utility: 'flex' }],
  })
  await expect(
    compileTailwindProfile(finite, {
      source: '',
      compile: async (source) => ({
        build: () =>
          source.includes('@apply')
            ? '.toned_mapping_probe {display:flex}'
            : '/* .flex {} */ .other {content:".flex { display:flex }"}',
      }),
    }),
  ).rejects.toThrow('missing compiled candidate')
})
