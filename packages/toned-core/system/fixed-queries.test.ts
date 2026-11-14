import { expect, it, vi } from 'vitest'

import { createTailwindBackend } from '../backends/tailwind.ts'
import { buildStyles } from '../build/index.ts'
import { collectManifestConditions } from '../build/manifest.ts'
import { buildTailwind } from '../build/tailwind.ts'
import { defineSystem, dp, percent } from '../index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { connectNativeMedia } from '../stylesheet/media.native.ts'
import { Base } from '../stylesheet/StyleSheet.ts'
import { evalExpr, parseConditionKey } from '../utils/conditions.ts'

it('explicit fixed query lengths preserve exact keys, build inventory, and backend guards', () => {
  const ui = defineSystem({
    id: 'fixed-queries',
    tokens: {},
    conditions: {
      containers: { card: {} },
      base: 99,
      widths: { media: [600], containers: { card: [300] } },
    },
  })
  const sheet = ui.stylesheet((q) => ({
    Root: {
      $style: { opacity: 1 },
      [q.media(dp(600))]: { $style: { opacity: 0 } },
      [q.container('card', dp(300))]: { $style: { opacity: 0.5 } },
    },
  }))
  const artifact = buildStyles(ui)
  expect(artifact.manifest.conditions).toEqual(['>=600px', 'card/>=300px'])
  expect(artifact.css).toContain('(min-width: 600px)')
  expect(artifact.css).toContain('@container card (min-width: 300px)')
  expect(artifact.css).not.toMatch(/min-width:\s*var\(/)
  const web = createWebRenderer(ui, {
    tokens: {},
    manifest: artifact.manifest,
  }).resolve(sheet)
  expect(JSON.stringify(web)).toContain('fixed-media-gte600px')
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(
    native.resolve(sheet, { facts: { '@>=600px': true } }).Root.style[
      'opacity'
    ],
  ).toBe(0)
  expect(
    native.resolve(sheet, {
      facts: { '@>=600px': true, '@card/>=300px': true },
    }).Root.style['opacity'],
  ).toBe(0.5)
  const base = new Base({
    ref: ui,
    rules: { Root: { '@card/>=300px': { style: { opacity: 0 } } } },
    config: {
      getTokens: () => ({}),
      platform: 'native',
      mediaMode: 'runtime',
      pseudoMode: 'runtime',
      useClassName: false,
    } as never,
  })
  for (const [width, expected] of [
    [299.9, false],
    [300, true],
    [300.1, true],
  ] as const)
    expect(base.conditionState({ card: width })?.['@card/>=300px']).toBe(
      expected,
    )
})

it('native viewport facts use the same fixed boundary independent of theme scales', () => {
  let width = 599.9
  let onChange = () => {}
  const notify = vi.fn()
  const stop = vi.fn()
  const connected = connectNativeMedia(
    {},
    ['@>=600px', '@!>=600px'],
    {
      id: 'fixed-query-test',
      renderer: 'custom',
      version: '1',
      accepts: () => true,
      patch: () => {},
      resetStyle: () => null,
      resetProp: () => null,
      getViewportWidth: () => width,
      subscribeViewport: (cb) => {
        onChange = cb
        return stop
      },
    },
    notify,
  )
  expect(connected.state).toMatchObject({
    '@>=600px': false,
    '@!>=600px': true,
  })
  width = 600
  onChange()
  expect(notify.mock.lastCall?.[0]).toMatchObject({
    '@>=600px': true,
    '@!>=600px': false,
  })
  width = 600.1
  onChange()
  expect(notify).toHaveBeenCalledOnce()
  connected.stop()
  expect(stop).toHaveBeenCalledOnce()
})

it('Boolean AST collection retains fixed thresholds and rejects runtime-relative lengths', () => {
  const ui = defineSystem({
    id: 'fixed-query-boolean',
    tokens: {},
    conditions: {
      containers: { card: {} },
      widths: { media: [600], containers: { card: [300] } },
    },
  })
  const sheet = ui.stylesheet({ Root: {} }).extend({
    [ui.q.all(ui.q.media(dp(600)), ui.q.container('card', dp(300)))]: {
      Root: { $style: { opacity: 0 } },
    },
  })
  const artifact = buildStyles(ui)
  expect(artifact.manifest.conditions).toEqual(['>=600px', 'card/>=300px'])
  expect(
    createWebRenderer(ui, { tokens: {}, manifest: artifact.manifest }).resolve(
      sheet,
    ),
  ).toBeDefined()
  expect(() => (ui.q.media as (x: unknown) => unknown)(percent(20))).toThrow(
    /dp lengths/,
  )
  expect(() =>
    ui.stylesheet({
      Root: { '@card/>=30rem': { $style: { opacity: 0 } } },
    } as never),
  ).toThrow(/explicit dp/)
  expect(parseConditionKey('>=30rem')).toBeNull()
  const out = new Set<string>()
  collectManifestConditions({ '@!>=600px&card/>=300px': {} }, out)
  expect([...out]).toEqual(['>=600px', 'card/>=300px'])
  expect(
    evalExpr(parseConditionKey('>=600px&card/>=300px')!, {
      media: () => true,
      containerPx: () => 300,
      stepWidth: () => undefined,
      basePx: 100,
    }),
  ).toBe(true)
})

it('build rejects named container steps colliding with local threshold toggle names', async () => {
  const ui = defineSystem({
    id: 'fixed-query-collision',
    tokens: {},
    conditions: {
      containers: { card: { gte300px: 500 } },
      widths: { containers: { card: [300] } },
    },
  })
  const sheet = ui.stylesheet((q) => ({
    Root: { [q.container('card', dp(300))]: { $style: { opacity: 0 } } },
  }))
  expect(() => buildStyles(ui)).toThrow(
    /condition toggle collision between card\/gte300px and card\/>=300px/,
  )
  const compile = vi.fn(async () => ({ build: () => '' }))
  const profile = createTailwindBackend({ id: 'collision-check', mappings: [] })
  await expect(
    buildTailwind(ui, profile, {
      sheets: [sheet],
      tokens: {},
      source: '',
      compile,
    }),
  ).rejects.toThrow(/condition toggle collision/)
  expect(compile).not.toHaveBeenCalled()
  const distinct = defineSystem({
    id: 'fixed-media-distinct',
    tokens: {},
    conditions: { media: { gte600px: 800 }, widths: { media: [600] } },
  })
  const other = distinct.stylesheet((q) => ({
    Root: { [q.media(dp(600))]: { $style: { opacity: 0 } } },
  }))
  expect(() => buildStyles(distinct)).not.toThrow()
  expect(other).toBeDefined()
})

it.each([
  ['768.0px', '768px'],
  ['768PX', '768px'],
  ['1e3px', '1000px'],
  ['.5px', '0.5px'],
])(
  'a fixed viewport width spelled %s throws, naming its one spelling',
  (spelling, canonical) => {
    const ui = defineSystem({
      id: 'fixed-spelling',
      tokens: {},
      conditions: { widths: { media: [768, 1000, 0.5] } },
    })
    const write = (width: string) =>
      ui.stylesheet({
        Root: {
          $style: { opacity: 1 },
          [`@>=${width}`]: { $style: { opacity: 0.5 } },
        },
      } as never)
    expect(() => write(spelling)).toThrow(
      `Toned: '@>=${spelling}' spells the width ${canonical} another way: write '@>=${canonical}', as q.media(dp(${canonical.slice(0, -2)})) does`,
    )
    expect(() => write(canonical)).not.toThrow()
  },
)

it('a container width has one spelling too', () => {
  const ui = defineSystem({
    id: 'fixed-container-spelling',
    tokens: {},
    conditions: {
      containers: { card: {} },
      widths: { containers: { card: [1000] } },
    },
  })
  expect(() =>
    ui.stylesheet({
      Root: { '@card/>=1e3px': { $style: { opacity: 1 } } },
    } as never),
  ).toThrow(
    "Toned: '@card/>=1e3px' spells the width 1000px another way: write '@card/>=1000px', as q.container('card', dp(1000)) does",
  )
})
